/**
 * Binance Exchange Rule Filters
 * Validates and normalizes quantity, price, and minNotional according to exchange rules.
 */

import { FinancialMath } from '../math/financial';

export interface SymbolFilter {
  symbol: string;
  minPrice: number;
  maxPrice: number;
  tickSize: number;
  minQty: number;
  maxQty: number;
  stepSize: number;
  minNotional: number;
}

const DEFAULT_SYMBOL_FILTERS: Record<string, SymbolFilter> = {
  'BTCUSDT': { symbol: 'BTCUSDT', minPrice: 0.1, maxPrice: 1000000, tickSize: 0.1, minQty: 0.001, maxQty: 1000, stepSize: 0.001, minNotional: 5.0 },
  'ETHUSDT': { symbol: 'ETHUSDT', minPrice: 0.01, maxPrice: 100000, tickSize: 0.01, minQty: 0.001, maxQty: 10000, stepSize: 0.001, minNotional: 5.0 },
  'SOLUSDT': { symbol: 'SOLUSDT', minPrice: 0.01, maxPrice: 10000, tickSize: 0.01, minQty: 0.01, maxQty: 50000, stepSize: 0.01, minNotional: 5.0 },
  'BNBUSDT': { symbol: 'BNBUSDT', minPrice: 0.01, maxPrice: 10000, tickSize: 0.01, minQty: 0.01, maxQty: 50000, stepSize: 0.01, minNotional: 5.0 },
  'ADAUSDT': { symbol: 'ADAUSDT', minPrice: 0.0001, maxPrice: 100, tickSize: 0.0001, minQty: 1, maxQty: 1000000, stepSize: 1, minNotional: 5.0 },
  'XRPUSDT': { symbol: 'XRPUSDT', minPrice: 0.0001, maxPrice: 100, tickSize: 0.0001, minQty: 1, maxQty: 1000000, stepSize: 1, minNotional: 5.0 },
  'DOGEUSDT': { symbol: 'DOGEUSDT', minPrice: 0.00001, maxPrice: 10, tickSize: 0.00001, minQty: 1, maxQty: 10000000, stepSize: 1, minNotional: 5.0 },
  'AVAXUSDT': { symbol: 'AVAXUSDT', minPrice: 0.01, maxPrice: 1000, tickSize: 0.01, minQty: 0.01, maxQty: 100000, stepSize: 0.01, minNotional: 5.0 },
};

export const ExchangeFilters = {
  getFilter(symbol: string): SymbolFilter {
    return DEFAULT_SYMBOL_FILTERS[symbol] || {
      symbol,
      minPrice: 0.0001,
      maxPrice: 1000000,
      tickSize: 0.0001,
      minQty: 0.001,
      maxQty: 1000000,
      stepSize: 0.001,
      minNotional: 5.0
    };
  },

  /**
   * Normalizes order price to tick size
   */
  normalizePrice(symbol: string, price: number): number {
    const filter = this.getFilter(symbol);
    return FinancialMath.roundTick(price, filter.tickSize);
  },

  /**
   * Normalizes order quantity to step size
   */
  normalizeQuantity(symbol: string, qty: number): number {
    const filter = this.getFilter(symbol);
    return FinancialMath.roundStep(qty, filter.stepSize);
  },

  /**
   * Validates whether order complies with MIN_NOTIONAL and lot size
   */
  validateOrder(symbol: string, price: number, qty: number): { valid: boolean; reason?: string } {
    const filter = this.getFilter(symbol);
    const notional = price * qty;

    if (price < filter.minPrice) {
      return { valid: false, reason: `Price ${price} is below minPrice ${filter.minPrice}` };
    }
    if (qty < filter.minQty) {
      return { valid: false, reason: `Quantity ${qty} is below minQty ${filter.minQty}` };
    }
    if (notional < filter.minNotional) {
      return { valid: false, reason: `Notional value $${notional.toFixed(2)} is below minNotional $${filter.minNotional}` };
    }

    return { valid: true };
  }
};
