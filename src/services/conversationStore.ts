import { prisma } from '../lib/db';
import type { ConversationChannel, MessageRole, Prisma } from '@prisma/client';

const MESSAGE_LIMIT = 20;

export interface StoredToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface StoredToolResult {
  tool_use_id: string;
  content: string;
}

export async function createConversation(
  merchantId: string,
  channel: ConversationChannel,
): Promise<string> {
  const conversation = await prisma.conversation.create({
    data: { merchantId, channel },
  });
  return conversation.id;
}

export async function loadRecentMessages(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: MESSAGE_LIMIT,
  });
}

export async function appendMessage(params: {
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls?: StoredToolCall[];
  toolResults?: StoredToolResult[];
  uiPayload?: Record<string, unknown>;
}): Promise<void> {
  await prisma.message.create({
    data: {
      conversationId: params.conversationId,
      role: params.role,
      content: params.content,
      toolCalls: (params.toolCalls ?? undefined) as unknown as Prisma.InputJsonValue,
      toolResults: (params.toolResults ?? undefined) as unknown as Prisma.InputJsonValue,
      uiPayload: (params.uiPayload ?? undefined) as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function trimConversationHistory(conversationId: string): Promise<void> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (messages.length <= MESSAGE_LIMIT) {
    return;
  }

  const toDelete = messages.slice(MESSAGE_LIMIT).map((m) => m.id);
  await prisma.message.deleteMany({ where: { id: { in: toDelete } } });
}

export async function getConversationForMerchant(
  conversationId: string,
  merchantId: string,
): Promise<boolean> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, merchantId },
  });
  return conversation !== null;
}
