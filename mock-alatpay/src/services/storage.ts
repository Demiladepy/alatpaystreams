import fs from 'fs/promises';
import path from 'path';
import type { Merchant, Transaction } from '../types';

const DATA_DIR = path.resolve(__dirname, '../../data');

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function merchantsPath(): string {
  return path.join(DATA_DIR, 'merchants.json');
}

function transactionsPath(): string {
  return path.join(DATA_DIR, 'transactions.json');
}

export async function readMerchants(): Promise<Merchant[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(merchantsPath(), 'utf-8');
    return JSON.parse(raw) as Merchant[];
  } catch {
    return [];
  }
}

export async function writeMerchants(merchants: Merchant[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(merchantsPath(), JSON.stringify(merchants, null, 2));
}

export async function readTransactions(): Promise<Transaction[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(transactionsPath(), 'utf-8');
    return JSON.parse(raw) as Transaction[];
  } catch {
    return [];
  }
}

export async function writeTransactions(transactions: Transaction[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(transactionsPath(), JSON.stringify(transactions, null, 2));
}

export async function getMerchant(accountId: string): Promise<Merchant | undefined> {
  const merchants = await readMerchants();
  return merchants.find((m) => m.id === accountId);
}

export async function updateMerchantBalance(
  accountId: string,
  deltaNaira: number,
): Promise<Merchant> {
  const merchants = await readMerchants();
  const index = merchants.findIndex((m) => m.id === accountId);
  if (index === -1) {
    throw new Error('MERCHANT_NOT_FOUND');
  }
  merchants[index].balanceNaira = Math.round((merchants[index].balanceNaira + deltaNaira) * 100) / 100;
  await writeMerchants(merchants);
  return merchants[index];
}

export async function appendTransaction(tx: Transaction): Promise<void> {
  const transactions = await readTransactions();
  transactions.push(tx);
  await writeTransactions(transactions);
}

export async function setMerchantBalance(accountId: string, balance: number): Promise<void> {
  const merchants = await readMerchants();
  const index = merchants.findIndex((m) => m.id === accountId);
  if (index === -1) {
    throw new Error('MERCHANT_NOT_FOUND');
  }
  merchants[index].balanceNaira = balance;
  await writeMerchants(merchants);
}

export async function removeTransactionsSince(isoDate: string): Promise<number> {
  const transactions = await readTransactions();
  const cutoff = new Date(isoDate).getTime();
  const kept = transactions.filter((tx) => new Date(tx.timestamp).getTime() < cutoff);
  const removed = transactions.length - kept.length;
  await writeTransactions(kept);
  return removed;
}

export { DATA_DIR };
