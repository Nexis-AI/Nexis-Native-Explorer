import { Router } from 'express';
import { prisma } from '../services/prisma';
import { AppError } from '../middleware/error-handler';
import { validate } from '../middleware/validate';
import { cacheMiddleware } from '../middleware/cache';
import { tokenValidations } from '../validations/token.validation';
import { Prisma } from '@prisma/client';

export const tokensRouter = Router();

// Get all tokens
tokensRouter.get(
  '/',
  validate(tokenValidations.getTokens),
  cacheMiddleware({ ttl: 300 }), // Cache for 5 minutes
  async (req, res, next) => {
    try {
      const {
        search,
        sortBy = 'totalSupply',
        order = 'desc',
        limit = 100,
        offset = 0
      } = req.query;

      const where: Prisma.TokenWhereInput = search ? {
        OR: [
          { name: { contains: search as string, mode: Prisma.QueryMode.insensitive } },
          { symbol: { contains: search as string, mode: Prisma.QueryMode.insensitive } }
        ]
      } : {};

      const tokens = await prisma.token.findMany({
        where,
        orderBy: { [sortBy as string]: order },
        take: Number(limit),
        skip: Number(offset),
        include: {
          holders: {
            select: {
              id: true
            }
          }
        }
      });

      res.json({
        tokens: tokens.map(token => ({
          ...token,
          holderCount: token.holders.length
        }))
      });
    } catch (error) {
      next(new AppError('Failed to fetch tokens', 500));
    }
  }
);

// Get token by address
tokensRouter.get(
  '/:address',
  validate(tokenValidations.getToken),
  cacheMiddleware({ ttl: 300 }), // Cache for 5 minutes
  async (req, res, next) => {
    try {
      const token = await prisma.token.findUnique({
        where: { address: req.params.address },
        include: {
          holders: {
            select: {
              id: true
            }
          }
        }
      });

      if (!token) {
        throw new AppError('Token not found', 404);
      }

      res.json({
        ...token,
        holderCount: token.holders.length
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch token details', 500));
      }
    }
  }
);

// Get token holders
tokensRouter.get(
  '/:address/holders',
  validate(tokenValidations.getTokenHolders),
  cacheMiddleware({ ttl: 60 }), // Cache for 1 minute
  async (req, res, next) => {
    try {
      const token = await prisma.token.findUnique({
        where: { address: req.params.address }
      });

      if (!token) {
        throw new AppError('Token not found', 404);
      }

      const holders = await prisma.account.findMany({
        where: {
          tokens: {
            some: {
              id: token.id
            }
          }
        },
        take: 100,
        orderBy: {
          balance: 'desc'
        }
      });

      res.json({ holders });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch token holders', 500));
      }
    }
  }
);

// Get token transfers
tokensRouter.get(
  '/:address/transfers',
  validate(tokenValidations.getTokenTransfers),
  cacheMiddleware({ ttl: 60 }), // Cache for 1 minute
  async (req, res, next) => {
    try {
      const token = await prisma.token.findUnique({
        where: { address: req.params.address }
      });

      if (!token) {
        throw new AppError('Token not found', 404);
      }

      const transfers = await prisma.transaction.findMany({
        where: {
          type: 'TOKEN_TRANSFER',
          data: {
            path: ['tokenAddress'],
            equals: token.address
          }
        },
        include: {
          from: true,
          to: true
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 100
      });

      res.json({ transfers });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch token transfers', 500));
      }
    }
  }
); 