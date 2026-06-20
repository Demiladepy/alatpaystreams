import { Router, Request, Response, NextFunction } from 'express';
import {
  getAllBankHealth,
  getBankHealth,
  getBankHealthHistory,
} from '../services/uptimeMonitor';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const banks = await getAllBankHealth();
    res.json(banks);
  } catch (error) {
    next(error);
  }
});

router.get('/:bankCode/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await getBankHealthHistory(String(req.params.bankCode));
    res.json(history);
  } catch (error) {
    next(error);
  }
});

router.get('/:bankCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await getBankHealth(String(req.params.bankCode));
    res.json(health);
  } catch (error) {
    next(error);
  }
});

export default router;
