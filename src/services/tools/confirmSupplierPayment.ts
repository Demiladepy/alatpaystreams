import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { alatpayService } from '../../integrations/alatpay';
import Decimal from 'decimal.js';

export interface ConfirmSupplierPaymentInput {
  merchantId: string;
  supplierName: string;
  amountNaira: number;
  confirmationId?: string;
  confirm?: boolean;
}

interface PendingConfirmation {
  merchantId: string;
  supplierName: string;
  amountNaira: number;
  createdAt: string;
}

const pending = new Map<string, PendingConfirmation>();

export async function confirmSupplierPayment(input: ConfirmSupplierPaymentInput) {
  if (input.confirm && input.confirmationId) {
    const record = pending.get(input.confirmationId);
    if (!record) {
      return { success: false, error: 'Confirmation not found or expired.' };
    }
    if (record.merchantId !== input.merchantId) {
      return { success: false, error: 'Confirmation does not belong to this merchant.' };
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: input.merchantId },
    });
    if (!merchant?.alatpayAccountId) {
      return { success: false, error: 'Merchant has no ALATPay account linked.' };
    }

    pending.delete(input.confirmationId);

    const payout = await alatpayService.payout({
      merchantAccountId: merchant.alatpayAccountId,
      amountNaira: new Decimal(record.amountNaira),
      narration: `Supplier payment — ${record.supplierName}`,
      reference: `SUP-${input.confirmationId}`,
    });

    await prisma.ledgerEvent.create({
      data: {
        merchantId: input.merchantId,
        type: 'SUPPLIER_PAYMENT',
        payload: {
          supplierName: record.supplierName,
          amountNaira: record.amountNaira,
          transactionId: payout.transactionId,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      success: true,
      status: 'executed',
      transactionId: payout.transactionId,
      amountNaira: record.amountNaira,
      supplierName: record.supplierName,
    };
  }

  const confirmationId = crypto.randomUUID();
  pending.set(confirmationId, {
    merchantId: input.merchantId,
    supplierName: input.supplierName,
    amountNaira: input.amountNaira,
    createdAt: new Date().toISOString(),
  });

  setTimeout(() => pending.delete(confirmationId), 30 * 60 * 1000);

  return {
    success: true,
    status: 'pending',
    confirmationId,
    supplierName: input.supplierName,
    amountNaira: input.amountNaira,
    message: `Ready to pay ${input.supplierName} ₦${input.amountNaira.toLocaleString('en-NG')}. Reply YES to confirm.`,
  };
}

export const confirmSupplierPaymentDefinition = {
  name: 'confirm_supplier_payment',
  description:
    'Stage a supplier payout for user confirmation. Call again with confirm=true and confirmationId after user says yes.',
  input_schema: {
    type: 'object' as const,
    properties: {
      merchantId: { type: 'string' },
      supplierName: { type: 'string' },
      amountNaira: { type: 'number' },
      confirmationId: { type: 'string' },
      confirm: { type: 'boolean' },
    },
    required: ['merchantId'],
  },
};

export function clearPendingConfirmations(): void {
  pending.clear();
}
