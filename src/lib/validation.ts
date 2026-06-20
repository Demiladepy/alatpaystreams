import { z } from 'zod';

const cuidRegex = /^c[a-z0-9]{24,}$/;

export const merchantIdSchema = z
  .string()
  .trim()
  .min(1)
  .refine((v) => cuidRegex.test(v) || v.startsWith('mock_'), 'Invalid merchantId format');

export const chatMessageSchema = z.object({
  merchantId: merchantIdSchema,
  conversationId: z.string().regex(cuidRegex).optional(),
  message: z
    .string()
    .trim()
    .min(1, 'message cannot be empty')
    .max(4000, 'message exceeds 4000 characters'),
  channel: z.enum(['WHATSAPP', 'DASHBOARD']),
});

export const simulateTransactionSchema = z.object({
  merchantId: merchantIdSchema,
  amountNaira: z.union([
    z.number().positive('amountNaira must be positive'),
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'amountNaira must be a valid decimal string')
      .refine((v) => parseFloat(v) > 0, 'amountNaira must be positive'),
  ]),
});

const bucketRuleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('PERCENTAGE'), value: z.number().min(0).max(100) }),
  z.object({ kind: z.literal('FIXED'), value: z.number().positive() }),
  z.object({ kind: z.literal('WEEKLY_FIXED'), value: z.number().positive() }),
]);

export const createBucketSchema = z.object({
  merchantId: merchantIdSchema,
  name: z.string().trim().min(1).max(120),
  type: z.enum([
    'TAX',
    'SAVINGS',
    'SUPPLIER',
    'OWNER_SALARY',
    'LOAN_REPAYMENT',
    'CUSTOM',
  ]),
  rule: bucketRuleSchema,
  priority: z.number().int().min(0),
  isActive: z.boolean().optional(),
});

export function validationError(message: string, code = 'VALIDATION_ERROR') {
  return { error: { code, message } };
}

export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown):
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join('; ');
    return { success: false, error: { code: 'VALIDATION_ERROR', message } };
  }
  return { success: true, data: result.data };
}
