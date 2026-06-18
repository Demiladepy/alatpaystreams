import Anthropic from '@anthropic-ai/sdk';
import type { Message as DbMessage } from '@prisma/client';
import { logger } from '../lib/logger';
import type { AssistantResponse, HandleMessageResult } from '../types/assistant';
import {
  appendMessage,
  loadRecentMessages,
  type StoredToolCall,
  type StoredToolResult,
} from './conversationStore';
import { SYSTEM_PROMPT } from './prompts';
import { buildAssistantResponse } from './responseBuilder';
import { toolDefinitions, toolExecutors } from './tools';

const MODEL = 'claude-sonnet-4-6';
const MAX_ITERATIONS = 5;
const MAX_TOOL_CALLS_PER_MESSAGE = 5;

let lastEligibilityByMerchant = new Map<string, { eligible: boolean; at: number }>();

export function resetEligibilityCache(): void {
  lastEligibilityByMerchant = new Map();
}

function dbMessagesToAnthropic(messages: DbMessage[]): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === 'USER') {
      result.push({ role: 'user', content: msg.content });
      continue;
    }

    if (msg.role === 'ASSISTANT') {
      const toolCalls = msg.toolCalls as StoredToolCall[] | null;
      if (toolCalls && toolCalls.length > 0) {
        const blocks: Anthropic.ContentBlockParam[] = [];
        if (msg.content) {
          blocks.push({ type: 'text', text: msg.content });
        }
        for (const call of toolCalls) {
          blocks.push({
            type: 'tool_use',
            id: call.id,
            name: call.name,
            input: call.input,
          });
        }
        result.push({ role: 'assistant', content: blocks });
      } else {
        result.push({ role: 'assistant', content: msg.content });
      }
      continue;
    }

    if (msg.role === 'TOOL') {
      const toolResults = msg.toolResults as StoredToolResult[] | null;
      if (toolResults) {
        result.push({
          role: 'user',
          content: toolResults.map((tr) => ({
            type: 'tool_result' as const,
            tool_use_id: tr.tool_use_id,
            content: tr.content,
          })),
        });
      }
    }
  }

  return result;
}

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  merchantId: string,
): Promise<unknown> {
  const start = Date.now();
  const executor = toolExecutors[name];

  if (!executor) {
    throw new Error(`Unknown tool: ${name}`);
  }

  if (name === 'make_offer') {
    const cached = lastEligibilityByMerchant.get(merchantId);
    if (!cached?.eligible) {
      const blocked = {
        error: 'Cannot make offer — check_eligibility must return eligible=true first.',
      };
      logger.warn(
        { merchantId, tool: name, input, output: blocked, durationMs: Date.now() - start },
        'tool blocked',
      );
      return blocked;
    }
  }

  try {
    const output = await executor({ ...input, merchantId });
    logger.info(
      { merchantId, tool: name, input, output, durationMs: Date.now() - start },
      'tool executed',
    );

    if (name === 'check_eligibility') {
      const result = output as { eligible: boolean };
      lastEligibilityByMerchant.set(merchantId, {
        eligible: result.eligible,
        at: Date.now(),
      });
    }

    return output;
  } catch (err) {
    logger.error(
      { merchantId, tool: name, input, err, durationMs: Date.now() - start },
      'tool failed',
    );
    throw err;
  }
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  return new Anthropic({ apiKey });
}

async function finalizeAssistantTurn(opts: {
  conversationId: string;
  assistantText: string;
  toolsCalled: string[];
  toolOutputs: Record<string, unknown>;
  userMessage: string;
}): Promise<HandleMessageResult> {
  const response = buildAssistantResponse({
    assistantText: opts.assistantText,
    toolsCalled: opts.toolsCalled,
    toolOutputs: opts.toolOutputs,
    userMessage: opts.userMessage,
  });

  const displayText =
    response.type === 'text' ? response.body : response.body;

  await appendMessage({
    conversationId: opts.conversationId,
    role: 'ASSISTANT',
    content: displayText,
    uiPayload: response as unknown as Record<string, unknown>,
  });

  return {
    assistantMessage: displayText,
    response,
    toolsCalled: opts.toolsCalled,
    conversationId: opts.conversationId,
  };
}

export async function handleMessage(opts: {
  merchantId: string;
  conversationId: string;
  userMessage: string;
  channel: 'WHATSAPP' | 'DASHBOARD';
}): Promise<HandleMessageResult> {
  const client = getClient();
  const toolsCalled: string[] = [];
  const toolOutputs: Record<string, unknown> = {};
  let toolCallCount = 0;

  await appendMessage({
    conversationId: opts.conversationId,
    role: 'USER',
    content: opts.userMessage,
  });

  const history = await loadRecentMessages(opts.conversationId);
  let messages = dbMessagesToAnthropic(history);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: toolDefinitions,
      messages,
    });

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    );
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    if (toolUseBlocks.length === 0) {
      const assistantText =
        textBlocks.map((b) => b.text).join('\n').trim() ||
        "I'll look into that and get back to you.";

      return finalizeAssistantTurn({
        conversationId: opts.conversationId,
        assistantText,
        toolsCalled,
        toolOutputs,
        userMessage: opts.userMessage,
      });
    }

    const storedCalls: StoredToolCall[] = toolUseBlocks.map((block) => ({
      id: block.id,
      name: block.name,
      input: block.input as Record<string, unknown>,
    }));

    await appendMessage({
      conversationId: opts.conversationId,
      role: 'ASSISTANT',
      content: textBlocks.map((b) => b.text).join('\n'),
      toolCalls: storedCalls,
    });

    messages = [
      ...messages,
      { role: 'assistant', content: response.content },
    ];

    const toolResults: StoredToolResult[] = [];

    for (const block of toolUseBlocks) {
      if (toolCallCount >= MAX_TOOL_CALLS_PER_MESSAGE) {
        toolResults.push({
          tool_use_id: block.id,
          content: JSON.stringify({ error: 'Tool call limit reached for this message.' }),
        });
        continue;
      }

      toolCallCount += 1;
      toolsCalled.push(block.name);

      const output = await executeTool(
        block.name,
        block.input as Record<string, unknown>,
        opts.merchantId,
      );

      toolOutputs[block.name] = output;

      toolResults.push({
        tool_use_id: block.id,
        content: JSON.stringify(output),
      });
    }

    await appendMessage({
      conversationId: opts.conversationId,
      role: 'TOOL',
      content: '',
      toolResults,
    });

    messages = [
      ...messages,
      {
        role: 'user',
        content: toolResults.map((tr) => ({
          type: 'tool_result' as const,
          tool_use_id: tr.tool_use_id,
          content: tr.content,
        })),
      },
    ];

    if (toolCallCount >= MAX_TOOL_CALLS_PER_MESSAGE) {
      break;
    }
  }

  const fallback =
    "I've pulled what I can for now. Send another message if you need anything else.";

  return finalizeAssistantTurn({
    conversationId: opts.conversationId,
    assistantText: fallback,
    toolsCalled,
    toolOutputs,
    userMessage: opts.userMessage,
  });
}

export type { AssistantResponse, HandleMessageResult };
