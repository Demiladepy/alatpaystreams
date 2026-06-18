/**
 * Generates synthetic transaction arrays for underwriting fixture JSON files.
 * Run: npx tsx tests/fixtures/underwriting/generate-fixtures.ts
 */
import fs from 'fs';
import path from 'path';

type FixtureTx = {
  amountNaira: number;
  daysAgo: number;
  source?: 'CUSTOMER_PAYMENT' | 'REFUND';
  raw?: { customerName?: string; settlementStatus?: string };
};

function dailySpread(
  daysAgoStart: number,
  daysAgoEnd: number,
  dailyTotal: number,
  txsPerDay: number,
  customerPrefix: string,
  customerCount: number,
): FixtureTx[] {
  const txs: FixtureTx[] = [];
  for (let day = daysAgoStart; day >= daysAgoEnd; day--) {
    const perTx = Math.round(dailyTotal / txsPerDay);
    for (let i = 0; i < txsPerDay; i++) {
      txs.push({
        amountNaira: perTx,
        daysAgo: day,
        raw: {
          customerName: `${customerPrefix} ${(day + i) % customerCount}`,
        },
      });
    }
  }
  return txs;
}

function buildThinFile(): FixtureTx[] {
  const bridge = dailySpread(45, 31, 13_000, 2, 'Cust', 6);
  const last30 = dailySpread(30, 1, 12_000, 2, 'Cust', 6);
  return [...bridge, ...last30];
}

function buildStrongFile(): FixtureTx[] {
  const history = dailySpread(119, 61, 25_000, 4, 'Buyer', 12);
  const last30 = dailySpread(30, 1, 70_000, 5, 'Buyer', 15);
  const prior30 = dailySpread(60, 31, 50_000, 4, 'Buyer', 15);
  return [...history, ...last30, ...prior30];
}

function buildConcentrated(): FixtureTx[] {
  const txs: FixtureTx[] = [];
  for (let day = 90; day >= 1; day--) {
    txs.push(
      { amountNaira: 10_000, daysAgo: day, raw: { customerName: 'Mega Corp' } },
      { amountNaira: 10_000, daysAgo: day, raw: { customerName: 'Mega Corp' } },
      { amountNaira: 10_000, daysAgo: day, raw: { customerName: 'Mega Corp' } },
      { amountNaira: 10_000, daysAgo: day, raw: { customerName: 'Mega Corp' } },
      { amountNaira: 10_000, daysAgo: day, raw: { customerName: 'Mega Corp' } },
      { amountNaira: 10_000, daysAgo: day, raw: { customerName: 'Other 1' } },
      { amountNaira: 10_000, daysAgo: day, raw: { customerName: 'Other 2' } },
    );
  }
  return txs;
}

function buildDeclining(): FixtureTx[] {
  const history = dailySpread(89, 61, 20_000, 3, 'Shop', 6);
  const prior30 = dailySpread(60, 31, 33_000, 3, 'Shop', 6);
  const last30 = dailySpread(30, 1, 20_000, 3, 'Shop', 6);
  return [...history, ...prior30, ...last30];
}

function buildSpike(): FixtureTx[] {
  const history = dailySpread(89, 31, 8_000, 2, 'Spike', 4);
  const prior30 = dailySpread(60, 31, 10_000, 2, 'Spike', 4);
  const last30 = dailySpread(30, 1, 100_000, 4, 'Spike', 4);
  return [...history, ...prior30, ...last30];
}

function buildActiveLoanBase(): FixtureTx[] {
  return buildStrongFile();
}

const builders: Record<string, () => FixtureTx[]> = {
  'thin-file': buildThinFile,
  'strong-file': buildStrongFile,
  concentrated: buildConcentrated,
  declining: buildDeclining,
  'suspicious-spike': buildSpike,
  'active-loan': buildActiveLoanBase,
};

const dir = path.join(__dirname);

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const full = path.join(dir, file);
  const fixture = JSON.parse(fs.readFileSync(full, 'utf8'));
  const builder = builders[fixture.name];
  if (!builder) continue;
  fixture.transactions = builder();
  fs.writeFileSync(full, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(`Updated ${file} with ${fixture.transactions.length} transactions`);
}
