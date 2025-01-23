import { checkSchema } from 'express-validator';
import type { ParamSchema } from 'express-validator';

// Common validation schemas
const addressSchema: ParamSchema = {
  in: ['params'],
  matches: {
    options: /^[A-Za-z0-9]{32,44}$/
  },
  errorMessage: 'Invalid address format'
};

const paginationSchema: Record<string, ParamSchema> = {
  limit: {
    in: ['query'],
    optional: true,
    isInt: {
      options: { min: 1, max: 100 }
    },
    errorMessage: 'Limit must be between 1 and 100'
  },
  offset: {
    in: ['query'],
    optional: true,
    isInt: {
      options: { min: 0 }
    },
    errorMessage: 'Offset must be a non-negative integer'
  },
  sortBy: {
    in: ['query'],
    optional: true,
    isIn: {
      options: [['createdAt', 'name', 'symbol']]
    }
  },
  order: {
    in: ['query'],
    optional: true,
    isIn: {
      options: [['asc', 'desc']]
    }
  }
};

// NFT validation schemas
export const nftValidations = {
  getCollections: checkSchema({
    search: {
      in: ['query'],
      optional: true,
      isString: true,
      trim: true
    },
    ...paginationSchema
  }),

  getCollection: checkSchema({
    address: addressSchema
  }),

  getCollectionNFTs: checkSchema({
    address: addressSchema,
    ...paginationSchema
  }),

  getNFT: checkSchema({
    address: addressSchema,
    tokenId: {
      in: ['params'],
      isString: true,
      trim: true
    }
  }),

  getNFTHistory: checkSchema({
    address: addressSchema,
    tokenId: {
      in: ['params'],
      isString: true,
      trim: true
    },
    ...paginationSchema
  })
}; 