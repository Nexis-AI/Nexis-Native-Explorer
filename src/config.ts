import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  rpcEndpoint: string;
  database: {
    url: string;
  };
  jwt: {
    secret: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

export const config: Config = {
  port: Number.parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  rpcEndpoint: process.env.RPC_ENDPOINT || 'https://api.testnet.nexis.network',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key',
  },
  rateLimit: {
    windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10) * 60 * 1000, // minutes to ms
    max: Number.parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
}; 