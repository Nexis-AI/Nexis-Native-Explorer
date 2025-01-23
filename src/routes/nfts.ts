import { Router } from 'express';
import { prisma } from '../services/prisma';
import { AppError } from '../middleware/error-handler';
import { validate } from '../middleware/validate';
import { searchLimiter } from '../middleware/rate-limit';
import { cacheMiddleware } from '../middleware/cache';
import { nftValidations } from '../validations/nft.validation';
import { Prisma } from '@prisma/client';

const nftsRouter = Router();

// Get all NFT collections with optional filters
nftsRouter.get('/collections',
  validate(nftValidations.getCollections),
  searchLimiter,
  cacheMiddleware({ ttl: 300 }), // Cache for 5 minutes
  async (req, res, next) => {
    try {
      const {
        search,
        sortBy = 'totalVolume',
        order = 'desc',
        limit = 100,
        offset = 0
      } = req.query;

      const where: Prisma.NFTCollectionWhereInput = search ? {
        OR: [
          { name: { contains: search as string, mode: Prisma.QueryMode.insensitive } },
          { symbol: { contains: search as string, mode: Prisma.QueryMode.insensitive } },
        ]
      } : {};

      const collections = await prisma.nFTCollection.findMany({
        where,
        orderBy: { [sortBy as string]: order },
        take: Number(limit),
        skip: Number(offset)
      });

      res.json({ collections });
    } catch (error) {
      const err = new AppError('Failed to fetch NFT collections', 500);
      next(err);
    }
});

// Get collection by address
nftsRouter.get('/collections/:address',
  validate(nftValidations.getCollection),
  cacheMiddleware({ ttl: 300 }), // Cache for 5 minutes
  async (req, res, next) => {
    try {
      const collection = await prisma.nFTCollection.findUnique({
        where: { address: req.params.address },
        include: {
          _count: {
            select: { nfts: true }
          }
        }
      });

      if (!collection) {
        const error = new AppError('Collection not found', 404);
        return next(error);
      }

      res.json({ collection });
    } catch (error) {
      const err = new AppError('Failed to fetch collection details', 500);
      next(err);
    }
});

// Get NFTs in a collection
nftsRouter.get('/collections/:address/nfts',
  validate(nftValidations.getCollectionNFTs),
  cacheMiddleware({ ttl: 60 }), // Cache for 1 minute
  async (req, res, next) => {
    try {
      const {
        limit = 100,
        offset = 0
      } = req.query;

      const collection = await prisma.nFTCollection.findUnique({
        where: { address: req.params.address }
      });

      if (!collection) {
        const error = new AppError('Collection not found', 404);
        return next(error);
      }

      const nfts = await prisma.nFT.findMany({
        where: { collectionId: collection.id },
        orderBy: { tokenId: 'asc' },
        take: Number(limit),
        skip: Number(offset)
      });

      res.json({ nfts });
    } catch (error) {
      const err = new AppError('Failed to fetch NFTs', 500);
      next(err);
    }
});

// Get specific NFT
nftsRouter.get('/collections/:address/:tokenId',
  validate(nftValidations.getNFT),
  cacheMiddleware({ ttl: 300 }), // Cache for 5 minutes
  async (req, res, next) => {
    try {
      const collection = await prisma.nFTCollection.findUnique({
        where: { address: req.params.address }
      });

      if (!collection) {
        const error = new AppError('Collection not found', 404);
        return next(error);
      }

      const nft = await prisma.nFT.findUnique({
        where: {
          collectionId_tokenId: {
            collectionId: collection.id,
            tokenId: req.params.tokenId
          }
        },
        include: {
          collection: true
        }
      });

      if (!nft) {
        const error = new AppError('NFT not found', 404);
        return next(error);
      }

      res.json({ nft });
    } catch (error) {
      const err = new AppError('Failed to fetch NFT details', 500);
      next(err);
    }
});

// Get NFT transfer history
nftsRouter.get('/collections/:address/:tokenId/history',
  validate(nftValidations.getNFTHistory),
  cacheMiddleware({ ttl: 60 }), // Cache for 1 minute
  async (req, res, next) => {
    try {
      const {
        limit = 100,
        offset = 0
      } = req.query;

      const collection = await prisma.nFTCollection.findUnique({
        where: { address: req.params.address }
      });

      if (!collection) {
        const error = new AppError('Collection not found', 404);
        return next(error);
      }

      const nft = await prisma.nFT.findUnique({
        where: {
          collectionId_tokenId: {
            collectionId: collection.id,
            tokenId: req.params.tokenId
          }
        }
      });

      if (!nft) {
        const error = new AppError('NFT not found', 404);
        return next(error);
      }

      const transfers = await prisma.nFTTransfer.findMany({
        where: { nftId: nft.id },
        include: {
          transaction: {
            select: {
              slot: true,
              timestamp: true,
              hash: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      });

      res.json({ transfers });
    } catch (error) {
      const err = new AppError('Failed to fetch NFT transfer history', 500);
      next(err);
    }
});

export { nftsRouter }; 