import crypto from 'crypto';
import Decimal from 'decimal.js';
import nock from 'nock';
import fixtures from './fixtures/alatpay/responses.json';
import {
  alatpayService,
  ALATPayCircuitOpenError,
  resetALATPayStateForTests,
} from '../src/integrations/alatpay';
import {
  cachePayout,
  claimWebhook,
  releaseWebhookClaim,
} from '../src/integrations/alatpay/redisStore';
import { verifyWebhookSignature } from '../src/integrations/alatpay/signatureVerify';

const BASE = 'http://alatpay.test';

jest.mock('../src/lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

import { redis } from '../src/lib/redis';

const mockRedis = redis as jest.Mocked<typeof redis>;

describe('ALATPay integration', () => {
  beforeEach(() => {
    process.env.ALATPAY_USE_MOCK = 'false';
    process.env.ALATPAY_BASE_URL = BASE;
    process.env.ALATPAY_WEBHOOK_SECRET = 'test-secret';
    process.env.ALATPAY_API_KEY = 'test-key';
    resetALATPayStateForTests();
    nock.cleanAll();
    jest.clearAllMocks();
  });

  afterAll(() => {
    nock.restore();
  });

  it('payout succeeds against recorded fixture', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');

    nock(BASE)
      .post('/alatpay/payout')
      .reply(200, fixtures.payoutSuccess);

    const result = await alatpayService.payout({
      merchantAccountId: 'alatpay_funke_001',
      amountNaira: new Decimal(400000),
      narration: 'Loan disbursement',
      reference: 'LOAN-test-001',
    });

    expect(result.status).toBe('successful');
    expect(result.transactionId).toBe('ALATPAY-fixture-001');
    expect(result.balanceAfter?.toFixed(2)).toBe('105000.00');
  });

  it('treats 200 with failed status in body as failure', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');

    nock(BASE).post('/alatpay/payout').reply(200, fixtures.payoutFailedBody);

    const result = await alatpayService.payout({
      merchantAccountId: 'alatpay_funke_001',
      amountNaira: new Decimal(10000),
      narration: 'Test',
      reference: 'LOAN-fail-001',
    });

    expect(result.status).toBe('failed');
    expect(result.failureReason).toMatch(/Insufficient/);
  });

  it('retries on 500 then succeeds', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');

    nock(BASE)
      .post('/alatpay/payout')
      .reply(500, { error: 'server error' })
      .post('/alatpay/payout')
      .reply(200, fixtures.payoutPending);

    const result = await alatpayService.payout({
      merchantAccountId: 'alatpay_funke_001',
      amountNaira: new Decimal(250000),
      narration: 'Retry test',
      reference: 'LOAN-retry-001',
    });

    expect(result.status).toBe('pending');
    expect(nock.isDone()).toBe(true);
  }, 15000);

  it('returns cached payout for idempotency key without second HTTP call', async () => {
    const cached = {
      status: 'successful' as const,
      transactionId: 'CACHED-TX',
      timestamp: new Date().toISOString(),
      balanceAfter: '90000.00',
    };
    mockRedis.get.mockResolvedValue(JSON.stringify(cached));

    const result = await alatpayService.payout({
      merchantAccountId: 'alatpay_funke_001',
      amountNaira: new Decimal(50000),
      narration: 'Cached',
      reference: 'LOAN-cached-001',
    });

    expect(result.transactionId).toBe('CACHED-TX');
    expect(nock.isDone()).toBe(true);
  });

  it('opens circuit after 5 consecutive payout failures', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');

    for (let i = 0; i < 5; i++) {
      nock(BASE).post('/alatpay/payout').reply(200, fixtures.payoutFailedBody);

      const result = await alatpayService.payout({
        merchantAccountId: 'alatpay_funke_001',
        amountNaira: new Decimal(1000),
        narration: 'Circuit test',
        reference: `LOAN-circuit-${i}`,
      });

      expect(result.status).toBe('failed');
    }

    await expect(
      alatpayService.payout({
        merchantAccountId: 'alatpay_funke_001',
        amountNaira: new Decimal(1000),
        narration: 'Circuit open',
        reference: 'LOAN-circuit-open',
      }),
    ).rejects.toBeInstanceOf(ALATPayCircuitOpenError);
  }, 15000);

  it('verifies webhook signature and parses payload', () => {
    const payload = { ...fixtures.webhookTransaction };
    const canonical = JSON.stringify({
      event: payload.event,
      timestamp: payload.timestamp,
      data: payload.data,
    });
    const signature = crypto
      .createHmac('sha256', 'test-secret')
      .update(canonical)
      .digest('hex');

    const rawBody = JSON.stringify({ ...payload, signature });

    expect(verifyWebhookSignature(rawBody, signature)).toBe(true);

    const parsed = alatpayService.parseWebhook(JSON.parse(rawBody));
    expect(parsed.transactionId).toBe('ALATPAY-wh-001');
    expect(parsed.amountNaira.toFixed(2)).toBe('50000.00');
    expect(parsed.channel).toBe('card');
  });

  it('dedupes webhooks via Redis claim', async () => {
    mockRedis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);

    const first = await claimWebhook('ALATPAY-wh-dedupe');
    const second = await claimWebhook('ALATPAY-wh-dedupe');

    expect(first).toBe(true);
    expect(second).toBe(false);

    await releaseWebhookClaim('ALATPAY-wh-dedupe');
    expect(mockRedis.del).toHaveBeenCalled();
  });

  it('getAccount returns balance from fixture', async () => {
    nock(BASE)
      .get('/alatpay/account/alatpay_funke_001')
      .reply(200, fixtures.accountActive);

    const account = await alatpayService.getAccount('alatpay_funke_001');

    expect(account.accountName).toBe('Funke Adebayo Beauty Ltd');
    expect(account.balanceNaira.toFixed(2)).toBe('145000.00');
    expect(account.status).toBe('active');
  });
});
