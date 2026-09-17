import { MarketTicker } from './types';

export class MarketWebSocketClient {
  private ws: any = null;
  public wsConnected: boolean = false;
  private wsReconnectTimer: any = null;
  private symbols: string[] = [];
  private onTickersUpdate: ((tickers: Record<string, MarketTicker>) => void) | null = null;
  private onConnectionChange: ((connected: boolean) => void) | null = null;

  constructor(
    symbols: string[],
    onTickersUpdate: (tickers: Record<string, MarketTicker>) => void,
    onConnectionChange: (connected: boolean) => void
  ) {
    this.symbols = symbols;
    this.onTickersUpdate = onTickersUpdate;
    this.onConnectionChange = onConnectionChange;
    this.connect();
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === 1 || this.ws.readyState === 0)) return;

    try {
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/market`;
      this.ws = new window.WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.wsConnected = true;
        this.onConnectionChange?.(true);
        if (this.ws?.readyState === 1) {
          this.ws.send(JSON.stringify({
            type: 'SUBSCRIBE',
            symbols: this.symbols
          }));
        }
      };

      this.ws.onmessage = (event: any) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'TICKERS_UPDATE' && Array.isArray(payload.tickers)) {
            const now = Date.now();
            const updated: Record<string, MarketTicker> = {};

            payload.tickers.forEach((t: any) => {
              const sym = t.symbol;
              const lastPrice = t.lastPrice;
              const bid = t.bid || (lastPrice * 0.9998);
              const ask = t.ask || (lastPrice * 1.0002);
              const spreadPct = lastPrice > 0 ? ((ask - bid) / lastPrice) * 100 : 0.04;

              const ticker: MarketTicker = {
                symbol: sym,
                marketType: 'USDT_M_FUTURES',
                lastPrice,
                bid,
                ask,
                spreadPct: Math.round(spreadPct * 1000) / 1000,
                change24h: t.change24h || 0,
                high24h: t.high24h || 0,
                low24h: t.low24h || 0,
                volume24h: t.volume24h || 0,
                exchangeTime: t.timestamp || now,
                localReceiveTime: now,
                dataSource: 'REAL_MARKET',
                isStale: false
              };
              updated[sym] = ticker;
            });

            this.onTickersUpdate?.(updated);
          }
        } catch (_) {}
      };

      this.ws.onclose = () => {
        this.wsConnected = false;
        this.onConnectionChange?.(false);
        clearTimeout(this.wsReconnectTimer);
        this.wsReconnectTimer = setTimeout(() => this.connect(), 3000);
      };

      this.ws.onerror = () => {
        this.wsConnected = false;
        this.onConnectionChange?.(false);
        try { this.ws?.close(); } catch (_) {}
      };
    } catch (_) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = setTimeout(() => this.connect(), 5000);
    }
  }

  public close() {
    clearTimeout(this.wsReconnectTimer);
    try {
      this.ws?.close();
    } catch (_) {}
  }
}
