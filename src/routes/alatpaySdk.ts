import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { isOfficialSdkMode } from '../integrations/alatpay/config';
import {
  getOfficialALATPayClient,
  type OfficialApiResponse,
} from '../integrations/alatpay/officialSdkClient';
import { ALATPayClientError } from '../integrations/alatpay/types';

const router = Router();

function sdkDisabled(_req: Request, res: Response): boolean {
  if (!isOfficialSdkMode()) {
    res.status(503).json({
      error: 'Official ALATPay SDK routes require ALATPAY_USE_MOCK=false',
    });
    return true;
  }
  return false;
}

function sendSdkResponse<T>(res: Response, result: OfficialApiResponse<T>): void {
  res.status(result.status ? 200 : 502).json({
    status: result.status,
    message: result.message,
    data: result.data,
  });
}

function handleSdkError(error: unknown, next: NextFunction): void {
  if (error instanceof ALATPayClientError) {
    next(error);
    return;
  }
  next(error);
}

/** Hosted checkout link — maps to SDK create_payment_link */
router.post('/payment-link', async (req: Request, res: Response, next: NextFunction) => {
  if (sdkDisabled(req, res)) return;

  try {
    const { email, amount, currency, redirect_url, business_id } = req.body as {
      email?: string;
      amount?: number;
      currency?: string;
      redirect_url?: string;
      business_id?: string;
    };

    if (!email?.trim() || amount === undefined || Number(amount) <= 0) {
      res.status(400).json({ error: 'email and a positive amount are required' });
      return;
    }

    const client = getOfficialALATPayClient();
    const result = await client.createPaymentLink({
      email: email.trim(),
      amount: Number(amount),
      currency,
      redirect_url,
      business_id,
    });
    sendSdkResponse(res, result);
  } catch (error) {
    handleSdkError(error, next);
  }
});

/** Bank-transfer virtual account — maps to SDK pay_via_virtual_account */
router.post('/virtual-account', async (req: Request, res: Response, next: NextFunction) => {
  if (sdkDisabled(req, res)) return;

  try {
    const {
      amount,
      order_id,
      description,
      currency,
      business_id,
      customer,
    } = req.body as {
      amount?: number;
      order_id?: string;
      description?: string;
      currency?: string;
      business_id?: string;
      customer?: {
        email?: string;
        phone?: string;
        first_name?: string;
        last_name?: string;
      };
    };

    if (!amount || amount <= 0 || !customer?.email || !customer.first_name || !customer.last_name) {
      res.status(400).json({
        error: 'amount, customer.email, customer.first_name, and customer.last_name are required',
      });
      return;
    }

    const client = getOfficialALATPayClient();
    const result = await client.payViaVirtualAccount({
      amount: Number(amount),
      order_id: order_id?.trim() || randomUUID(),
      description,
      currency,
      business_id,
      customer: {
        email: customer.email.trim(),
        phone: customer.phone?.trim(),
        first_name: customer.first_name.trim(),
        last_name: customer.last_name.trim(),
      },
    });
    sendSdkResponse(res, result);
  } catch (error) {
    handleSdkError(error, next);
  }
});

router.get('/transactions/:id', async (req: Request, res: Response, next: NextFunction) => {
  if (sdkDisabled(req, res)) return;

  try {
    const client = getOfficialALATPayClient();
    const result = await client.getTransaction(String(req.params.id));
    sendSdkResponse(res, result);
  } catch (error) {
    handleSdkError(error, next);
  }
});

export default router;
