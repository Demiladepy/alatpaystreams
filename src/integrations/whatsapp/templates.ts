/**
 * Pre-approved template definitions for Meta Business Manager submission.
 * Submit on day 3 — approval takes ~24 hours.
 */

export interface WhatsAppTemplateDefinition {
  name: string;
  category: 'MARKETING' | 'UTILITY';
  language: string;
  body: string;
  /** Variable placeholders {{1}}, {{2}}, etc. */
  exampleVariables: string[];
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    name: 'loan_offer',
    category: 'MARKETING',
    language: 'en',
    body:
      'Hi {{1}}, your ALATPay volume this week is ₦{{2}}. You qualify for a ₦{{3}} advance. Reply OFFER to see the terms.',
    exampleVariables: ['Funke', '1,400,000', '400,000'],
  },
  {
    name: 'tax_reminder',
    category: 'UTILITY',
    language: 'en',
    body:
      'Hi {{1}}, your VAT bucket has ₦{{2}}. Filing deadline is in {{3}} days. Reply REMIT to send to FIRS.',
    exampleVariables: ['Funke', '25,500', '7'],
  },
  {
    name: 'daily_summary',
    category: 'UTILITY',
    language: 'en',
    body:
      'Good evening {{1}}. Today: ₦{{2}} in sales across {{3}} transactions. Buckets filled automatically. Reply SUMMARY for the full breakdown.',
    exampleVariables: ['Funke', '340,000', '12'],
  },
];

/** Payload shape for Meta Graph API template creation (reference). */
export function templateToMetaPayload(template: WhatsAppTemplateDefinition) {
  return {
    name: template.name,
    category: template.category,
    language: template.language,
    components: [
      {
        type: 'BODY',
        text: template.body,
        example: {
          body_text: [template.exampleVariables],
        },
      },
    ],
  };
}

export function buildTemplateComponents(
  templateName: string,
  variables: string[],
): unknown[] {
  return [
    {
      type: 'body',
      parameters: variables.map((v) => ({ type: 'text', text: v })),
    },
  ];
}

export async function sendLoanOfferTemplate(
  to: string,
  merchantName: string,
  weeklyVolume: string,
  offerAmount: string,
  sendFn: (to: string, opts: { templateName: string; languageCode: string; components?: unknown[] }) => Promise<{ messageId: string }>,
): Promise<{ messageId: string }> {
  return sendFn(to, {
    templateName: 'loan_offer',
    languageCode: 'en',
    components: buildTemplateComponents('loan_offer', [
      merchantName,
      weeklyVolume,
      offerAmount,
    ]),
  });
}

export async function sendTaxReminderTemplate(
  to: string,
  merchantName: string,
  vatBalance: string,
  daysUntilDeadline: string,
  sendFn: (to: string, opts: { templateName: string; languageCode: string; components?: unknown[] }) => Promise<{ messageId: string }>,
): Promise<{ messageId: string }> {
  return sendFn(to, {
    templateName: 'tax_reminder',
    languageCode: 'en',
    components: buildTemplateComponents('tax_reminder', [
      merchantName,
      vatBalance,
      daysUntilDeadline,
    ]),
  });
}

export async function sendDailySummaryTemplate(
  to: string,
  merchantName: string,
  dailySales: string,
  transactionCount: string,
  sendFn: (to: string, opts: { templateName: string; languageCode: string; components?: unknown[] }) => Promise<{ messageId: string }>,
): Promise<{ messageId: string }> {
  return sendFn(to, {
    templateName: 'daily_summary',
    languageCode: 'en',
    components: buildTemplateComponents('daily_summary', [
      merchantName,
      dailySales,
      transactionCount,
    ]),
  });
}
