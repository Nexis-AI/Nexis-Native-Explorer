import { Router } from 'express';
import { prisma } from '../services/prisma';
import { rpcClient } from '../services/rpc-client';
import { AppError } from '../middleware/error-handler';
import { validate } from '../middleware/validate';
import { cacheMiddleware } from '../middleware/cache';
import { validatorValidations } from '../validations/validator.validation';

export const validatorsRouter = Router();

// Get all validators with their current performance
validatorsRouter.get(
  '/',
  validate(validatorValidations.getValidators),
  cacheMiddleware({ ttl: 300 }), // Cache for 5 minutes
  async (_req, res, next) => {
    try {
      // Get current vote accounts from RPC
      const { current, delinquent } = await rpcClient.getVoteAccounts();
      const allValidators = [...current, ...delinquent];

      // Get total supply for stake calculations
      const { total } = await rpcClient.getSupply();
      const totalStake = allValidators.reduce((sum, v) => sum + BigInt(v.activatedStake), BigInt(0));

      // Get validators from database with their blocks
      const dbValidators = await prisma.validator.findMany({
        include: {
          _count: {
            select: {
              blocks: true
            }
          }
        }
      });

      // Format and return response
      res.json({
        validators: allValidators.map(v => {
          const dbValidator = dbValidators.find(db => db.votePubkey === v.votePubkey);
          return {
            votePubkey: v.votePubkey,
            nodePubkey: v.nodePubkey,
            activatedStake: v.activatedStake,
            commission: v.commission,
            lastVote: v.lastVote,
            delinquent: delinquent.some(d => d.votePubkey === v.votePubkey),
            blockCount: dbValidator?._count.blocks ?? 0
          };
        }),
        totalStake: totalStake.toString(),
        totalSupply: total
      });
    } catch (error) {
      next(new AppError('Failed to fetch validators', 500));
    }
  }
);

// Get validator details by public key
validatorsRouter.get(
  '/:pubkey',
  validate(validatorValidations.getValidator),
  cacheMiddleware({ ttl: 300 }), // Cache for 5 minutes
  async (req, res, next) => {
    try {
      const { pubkey } = req.params;

      // Get validator from database
      const validator = await prisma.validator.findUnique({
        where: { votePubkey: pubkey },
        include: {
          blocks: {
            take: 100,
            orderBy: {
              timestamp: 'desc'
            }
          }
        }
      });

      if (!validator) {
        throw new AppError('Validator not found', 404);
      }

      // Get current performance from RPC
      const { current, delinquent } = await rpcClient.getVoteAccounts();
      const validatorInfo = [...current, ...delinquent].find(v => v.votePubkey === pubkey);

      if (!validatorInfo) {
        throw new AppError('Validator not found in current vote accounts', 404);
      }

      // Format and return response
      res.json({
        ...validator,
        activatedStake: validatorInfo.activatedStake,
        commission: validatorInfo.commission,
        lastVote: validatorInfo.lastVote,
        delinquent: delinquent.some(d => d.votePubkey === pubkey),
        blocks: validator.blocks
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch validator details', 500));
      }
    }
  }
); 