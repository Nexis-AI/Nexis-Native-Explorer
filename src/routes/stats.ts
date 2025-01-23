import { Router } from 'express';
import { prisma } from '../services/prisma';
import { rpcClient } from '../services/rpc-client';
import { AppError } from '../middleware/error-handler';

export const statsRouter = Router();

statsRouter.get('/current', async (_req, res, next) => {
  try {
    // Get current supply
    const { total, circulating } = await rpcClient.getSupply();

    // Get validator stats
    const { current, delinquent } = await rpcClient.getVoteAccounts();
    const totalValidators = current.length + delinquent.length;
    const activeStake = current.reduce((sum, v) => sum + BigInt(v.activatedStake), BigInt(0));

    // Get transaction stats
    const [txCount, blockCount] = await Promise.all([
      prisma.transaction.count(),
      prisma.block.count()
    ]);

    res.json({
      supply: {
        total,
        circulating
      },
      validators: {
        total: totalValidators,
        active: current.length,
        delinquent: delinquent.length,
        activeStake: activeStake.toString()
      },
      transactions: txCount,
      blocks: blockCount
    });
  } catch (error) {
    next(new AppError('Failed to fetch current stats', 500));
  }
});

statsRouter.get('/historical', async (_req, res, next) => {
  try {
    // TODO: Implement historical stats
    res.json({
      message: 'Historical stats not implemented yet'
    });
  } catch (error) {
    next(new AppError('Failed to fetch historical stats', 500));
  }
}); 