import { Router, Request, Response } from 'express';
import { getALATPayHealth } from '../integrations/alatpay';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json(getALATPayHealth());
});

export default router;
