# Nexis Explorer API Documentation

## Overview
This document outlines the API infrastructure required for the Nexis Explorer application, including RPC interactions, database schema, and implementation details.

## 1. RPC Integration Layer

### Base Configuration
- RPC Endpoint: `https://api.testnet.nexis.network`

### Available RPC Methods
```typescript
interface RPCMethods {
  getEpochInfo(): Promise<{
    epoch: number;
    slotIndex: number;
    slotsInEpoch: number;
    absoluteSlot: number;
    blockHeight: number;
    transactionCount: number;
  }>;
  
  getVoteAccounts(): Promise<{
    current: Array<{
      nodePubkey: string;
      votePubkey: string;
      commission: number;
      lastVote: number;
      rootSlot: number;
      activatedStake: number;
      delinquent: boolean;
    }>;
  }>;
  
  getSupply(): Promise<{
    total: number;
    circulating: number;
    effective: number;
  }>;
  
  getRecentPerformanceSamples(): Promise<Array<{
    slot: number;
    numTransactions: number;
    numSlots: number;
    samplePeriodSecs: number;
  }>>;
}
```

## 2. Database Schema (Prisma)

```prisma
// schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Validator {
  id            String   @id
  votePubkey    String   @unique
  nodePubkey    String
  commission    Int
  lastVote      BigInt
  activatedStake BigInt
  delinquent    Boolean
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Additional metadata
  name          String?
  website       String?
  description   String?
  avatar        String?
  
  // Performance metrics
  uptime        Float
  skipRate      Float
  
  // Relationships
  blocks        Block[]
  transactions  Transaction[]
}

model Block {
  id            String   @id
  slot          BigInt
  parentSlot    BigInt
  timestamp     DateTime
  hash          String   @unique
  validator     Validator @relation(fields: [validatorId], references: [id])
  validatorId   String
  transactions  Transaction[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Transaction {
  id            String   @id
  slot          BigInt
  block         Block    @relation(fields: [blockId], references: [id])
  blockId       String
  validator     Validator @relation(fields: [validatorId], references: [id])
  validatorId   String
  
  sender        String
  receiver      String
  amount        BigInt
  fee           BigInt
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model NetworkStats {
  id            String   @id @default(cuid())
  timestamp     DateTime
  
  // Epoch info
  epoch         BigInt
  slotIndex     BigInt
  slotsInEpoch  BigInt
  
  // Supply info
  totalSupply   BigInt
  circulating   BigInt
  effective     BigInt
  
  // Performance
  tps           Float
  
  createdAt     DateTime @default(now())
}
```

## 3. API Endpoints

```typescript
interface APIEndpoints {
  // Stats endpoints
  'GET /v1/stats/current': Response<{
    epoch: EpochInfo;
    supply: SupplyInfo;
    validators: ValidatorInfo[];
    performance: PerformanceInfo;
  }>;
  
  'GET /v1/stats/historical': Response<{
    timeRange: string;
    data: NetworkStats[];
  }>;
  
  // Search endpoints
  'GET /v1/search': Response<{
    type: 'address' | 'transaction' | 'validator';
    result: SearchResult;
  }>;
  
  // Validator specific endpoints
  'GET /v1/validators': Response<{
    validators: ValidatorInfo[];
    totalStake: number;
    activeStake: number;
  }>;
  
  'GET /v1/validators/:pubkey': Response<{
    validator: ValidatorDetailedInfo;
    performance: ValidatorPerformance;
    blocks: Block[];
  }>;
}
```

## 4. Implementation Requirements

### Dependencies
```bash
# Required dependencies
npm init -y
npm install @prisma/client @nexis/web3.js express typescript ts-node dotenv axios
npm install -D prisma @types/node @types/express
```

### Environment Configuration
```env
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/nexis_explorer"
RPC_ENDPOINT="https://api.testnet.nexis.network"
PORT=3001
```

### Implementation Phases

#### Phase 1: Core Infrastructure
- Setup Express server with TypeScript
- Initialize Prisma with the schema
- Create RPC client wrapper
- Implement basic error handling and logging

#### Phase 2: Data Collection
- Create service to fetch RPC data
- Implement database models
- Setup periodic data collection jobs
- Create indexing service for historical data

#### Phase 3: API Implementation
- Implement all REST endpoints
- Add validation and rate limiting
- Setup caching layer
- Add authentication for admin endpoints

#### Phase 4: Testing & Documentation
- Write unit tests
- Create integration tests
- Generate API documentation
- Setup monitoring and alerting

## 5. Data Flow

### RPC Data Collection
1. Periodic polling of RPC endpoints
2. Data transformation and validation
3. Storage in PostgreSQL database
4. Historical data aggregation

### API Request Flow
1. Client request received
2. Authentication/Rate limiting check
3. Data retrieval (Cache/DB/RPC)
4. Response transformation
5. Response sent to client

## 6. Security Considerations

1. Rate Limiting
- Implement rate limiting per IP/API key
- Configure reasonable limits based on endpoint

2. Authentication
- API key authentication for sensitive endpoints
- JWT tokens for admin access

3. Data Validation
- Input validation for all endpoints
- Sanitization of user inputs
- Parameter validation

4. Error Handling
- Proper error status codes
- Sanitized error messages
- Logging of critical errors

## 7. Monitoring & Maintenance

1. Health Checks
- RPC endpoint availability
- Database connection status
- API endpoint response times

2. Metrics Collection
- Request/response times
- Error rates
- Resource utilization

3. Alerting
- Critical error notifications
- Performance degradation alerts
- Resource utilization thresholds

4. Backup & Recovery
- Regular database backups
- Failover procedures
- Data recovery plans
