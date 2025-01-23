import { Router } from 'express';
import { prisma } from '../services/prisma';
import { AppError } from '../middleware/error-handler';

export const searchRouter = Router();

searchRouter.get('/:query', async (req, res, next) => {
  try {
    const { query } = req.params;
    if (!query || query.length < 3) {
      throw new AppError('Invalid search parameters', 400);
    }

    let result: unknown = null;
    let type: 'transaction' | 'validator' | 'token' = 'transaction';

    // Try to find transaction by hash
    result = await prisma.transaction.findUnique({
      where: {
        hash: query
      },
      include: {
        block: true,
        from: true,
        to: true
      }
    });

    if (!result) {
      // Try to find validator by pubkey
      result = await prisma.validator.findFirst({
        where: {
          OR: [
            { votePubkey: query },
            { nodePubkey: query }
          ]
        },
        include: {
          blocks: {
            take: 10,
            orderBy: {
              timestamp: 'desc'
            }
          }
        }
      });
      if (result) {
        type = 'validator';
      }
    }

    if (!result) {
      // Try to find by token symbol or name
      result = await prisma.token.findFirst({
        where: {
          OR: [
            { symbol: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } }
          ]
        }
      });
      if (result) {
        type = 'token';
      }
    }

    if (!result) {
      throw new AppError('No results found', 404);
    }

    res.json({
      type,
      result
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Search failed', 500));
    }
  }
}); 