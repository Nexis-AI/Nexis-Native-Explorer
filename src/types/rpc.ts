export interface EpochInfo {
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  absoluteSlot: number;
  blockHeight: number;
  transactionCount: number;
}

export interface VoteAccount {
  nodePubkey: string;
  votePubkey: string;
  commission: number;
  lastVote: number;
  rootSlot: number;
  activatedStake: number;
  delinquent: boolean;
}

export interface VoteAccounts {
  current: VoteAccount[];
  delinquent: VoteAccount[];
}

export interface SupplyInfo {
  total: number;
  circulating: number;
  effective: number;
}

export interface PerformanceSample {
  slot: number;
  numTransactions: number;
  numSlots: number;
  samplePeriodSecs: number;
} 