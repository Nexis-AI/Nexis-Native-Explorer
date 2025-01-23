import axios from 'axios';
import { config } from '../config';
import { EpochInfo, VoteAccounts, SupplyInfo, PerformanceSample } from '../types/rpc';

class RPCClient {
  private endpoint: string;
  private requestId: number;

  constructor() {
    this.endpoint = config.rpcEndpoint;
    this.requestId = 1;
  }

  private async makeRequest<T>(method: string, params: unknown[] = []): Promise<T> {
    try {
      const response = await axios.post(this.endpoint, {
        jsonrpc: '2.0',
        id: this.requestId++,
        method,
        params
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`RPC Error: ${error.message}`);
      }
      throw error;
    }
  }

  async getEpochInfo(): Promise<EpochInfo> {
    return this.makeRequest<EpochInfo>('getEpochInfo');
  }

  async getVoteAccounts(): Promise<VoteAccounts> {
    return this.makeRequest<VoteAccounts>('getVoteAccounts');
  }

  async getSupply(): Promise<SupplyInfo> {
    return this.makeRequest<SupplyInfo>('getSupply');
  }

  async getRecentPerformanceSamples(): Promise<PerformanceSample[]> {
    return this.makeRequest<PerformanceSample[]>('getRecentPerformanceSamples');
  }
}

export const rpcClient = new RPCClient(); 