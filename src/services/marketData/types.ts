import { DataSource, MarketType } from '../../types';

export interface MarketTicker {
  symbol: string;
  marketType: MarketType;
  lastPrice: number;
  markPrice?: number;
  bid: number;
  ask: number;
  spreadPct: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  fundingRate?: number;
  exchangeTime: number;
  localReceiveTime: number;
  dataSource: DataSource;
  isStale: boolean;
}
