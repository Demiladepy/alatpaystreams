import type { AssistantResponse } from '../types/assistant';

const RESPONSE_MARKER = '__ASSISTANT_RESPONSE__:';

interface MakeOfferOutput {
  offerId?: string;
}

export function parseEmbeddedResponse(text: string): {
  cleanText: string;
  embedded: AssistantResponse | null;
} {
  const markerIndex = text.lastIndexOf(RESPONSE_MARKER);
  if (markerIndex === -1) {
    return { cleanText: text, embedded: null };
  }

  const cleanText = text.slice(0, markerIndex).trim();
  const jsonPart = text.slice(markerIndex + RESPONSE_MARKER.length).trim();

  try {
    const parsed = JSON.parse(jsonPart) as AssistantResponse;
    if (parsed.type === 'text' || parsed.type === 'buttons' || parsed.type === 'list') {
      return { cleanText: cleanText || (parsed.type === 'text' ? parsed.body : cleanText), embedded: parsed };
    }
  } catch {
    // ignore malformed JSON
  }

  return { cleanText: text, embedded: null };
}

export function buildAssistantResponse(opts: {
  assistantText: string;
  toolsCalled: string[];
  toolOutputs: Record<string, unknown>;
  userMessage?: string;
}): AssistantResponse {
  const { cleanText, embedded } = parseEmbeddedResponse(opts.assistantText);

  if (embedded) {
    if (embedded.type === 'text') {
      return { ...embedded, body: cleanText || embedded.body };
    }
    return { ...embedded, body: cleanText || embedded.body };
  }

  const makeOfferOutput = opts.toolOutputs.make_offer as MakeOfferOutput | undefined;
  if (opts.toolsCalled.includes('make_offer') && makeOfferOutput?.offerId) {
    return {
      type: 'buttons',
      body: cleanText,
      buttons: [
        { id: `accept_loan:${makeOfferOutput.offerId}`, title: 'Accept' },
        { id: `decline_loan:${makeOfferOutput.offerId}`, title: 'Decline' },
        { id: `loan_info:${makeOfferOutput.offerId}`, title: 'More info' },
      ],
    };
  }

  const lowerUser = (opts.userMessage ?? '').toLowerCase();
  if (
    (lowerUser.includes('set up') && lowerUser.includes('bucket')) ||
    lowerUser.includes('configure bucket') ||
    lowerUser.includes('setup bucket')
  ) {
    return {
      type: 'list',
      body: cleanText || 'Pick a bucket type to start with:',
      buttonText: 'Choose bucket',
      sections: [
        {
          title: 'Common buckets',
          rows: [
            { id: 'bucket_tax', title: 'VAT / Tax', description: 'Set aside % for filing' },
            { id: 'bucket_savings', title: 'Savings', description: 'Emergency or growth fund' },
            { id: 'bucket_supplier', title: 'Supplier', description: 'Pay vendors on schedule' },
            { id: 'bucket_salary', title: 'Owner salary', description: 'Pay yourself first' },
          ],
        },
      ],
    };
  }

  return { type: 'text', body: cleanText };
}
