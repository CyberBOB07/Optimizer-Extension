export interface StrategyResult {
    netProfit: number;
    totalTrades: number;
    percentProfitable: number;
    profitFactor: number;
    maxDrawdown: number;
    avgTrade: number;
    avgWinTrade: number;
    avgLossTrade: number;
    avgBarsInTrade: number;
}

export interface Trade {
    date: Date;
    type: 'buy' | 'sell';
    price: number;
    quantity: number;
    profit: number;
}

export class TradingViewParser {
    // Селекторы для основной таблицы результатов
    private static readonly STRATEGY_TESTER_SELECTOR = '[data-name="strategy-tester"]';
    private static readonly PERFORMANCE_TABLE_SELECTOR = '[data-name="performance-summary"]';
    private static readonly NET_PROFIT_SELECTOR = '[data-name="net-profit"]';
    private static readonly TOTAL_TRADES_SELECTOR = '[data-name="total-trades"]';
    private static readonly PERCENT_PROFITABLE_SELECTOR = '[data-name="percent-profitable"]';
    private static readonly PROFIT_FACTOR_SELECTOR = '[data-name="profit-factor"]';
    private static readonly MAX_DRAWDOWN_SELECTOR = '[data-name="max-drawdown"]';
    private static readonly AVG_TRADE_SELECTOR = '[data-name="avg-trade"]';
    private static readonly AVG_WIN_TRADE_SELECTOR = '[data-name="avg-win-trade"]';
    private static readonly AVG_LOSS_TRADE_SELECTOR = '[data-name="avg-loss-trade"]';
    private static readonly AVG_BARS_SELECTOR = '[data-name="avg-bars-in-trade"]';

    // Селекторы для таблицы сделок
    private static readonly TRADES_TABLE_SELECTOR = '[data-name="trades-table"]';
    private static readonly TRADE_ROW_SELECTOR = '[data-name="trade-row"]';

    /**
     * Ждет появления элемента на странице
     */
    private static async waitForElement(selector: string, timeout: number = 10000): Promise<Element | null> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const element = document.querySelector(selector);
            if (element) return element;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.warn(`Timeout waiting for element: ${selector}`);
        return null;
    }

    /**
     * Извлекает числовое значение из текста
     */
    private static extractNumber(text: string | null | undefined): number {
        if (!text) return 0;
        const match = text.match(/-?\d+\.?\d*/);
        return match ? parseFloat(match[0]) : 0;
    }

    /**
     * Получает результаты стратегии из таблицы на странице TradingView
     */
    public static async getStrategyResults(): Promise<StrategyResult | null> {
        try {
            // Ждем загрузки тестера стратегий
            const tester = await this.waitForElement(this.STRATEGY_TESTER_SELECTOR);
            if (!tester) throw new Error('Strategy tester not found');

            // Ждем загрузки таблицы результатов
            const table = await this.waitForElement(this.PERFORMANCE_TABLE_SELECTOR);
            if (!table) throw new Error('Performance table not found');

            // Получаем все необходимые значения
            const getMetric = async (selector: string): Promise<number> => {
                const element = await this.waitForElement(selector);
                return this.extractNumber(element?.textContent);
            };

            return {
                netProfit: await getMetric(this.NET_PROFIT_SELECTOR),
                totalTrades: await getMetric(this.TOTAL_TRADES_SELECTOR),
                percentProfitable: await getMetric(this.PERCENT_PROFITABLE_SELECTOR),
                profitFactor: await getMetric(this.PROFIT_FACTOR_SELECTOR),
                maxDrawdown: await getMetric(this.MAX_DRAWDOWN_SELECTOR),
                avgTrade: await getMetric(this.AVG_TRADE_SELECTOR),
                avgWinTrade: await getMetric(this.AVG_WIN_TRADE_SELECTOR),
                avgLossTrade: await getMetric(this.AVG_LOSS_TRADE_SELECTOR),
                avgBarsInTrade: await getMetric(this.AVG_BARS_SELECTOR)
            };
        } catch (error) {
            console.error('Error getting strategy results:', error);
            return null;
        }
    }

    /**
     * Получает список сделок из таблицы на странице TradingView
     */
    public static async getTrades(): Promise<Trade[]> {
        try {
            const table = await this.waitForElement(this.TRADES_TABLE_SELECTOR);
            if (!table) throw new Error('Trades table not found');

            const trades: Trade[] = [];
            const rows = table.querySelectorAll(this.TRADE_ROW_SELECTOR);

            for (const row of rows) {
                try {
                    const cells = row.querySelectorAll('td');
                    if (cells.length < 5) continue;

                    const dateText = cells[0].textContent?.trim() || '';
                    const typeText = cells[1].textContent?.trim().toLowerCase() || '';
                    
                    const trade: Trade = {
                        date: new Date(dateText),
                        type: typeText.includes('buy') ? 'buy' : 'sell',
                        price: this.extractNumber(cells[2].textContent),
                        quantity: this.extractNumber(cells[3].textContent),
                        profit: this.extractNumber(cells[4].textContent)
                    };

                    trades.push(trade);
                } catch (rowError) {
                    console.warn('Error parsing trade row:', rowError);
                    continue;
                }
            }

            return trades;
        } catch (error) {
            console.error('Error getting trades:', error);
            return [];
        }
    }

    /**
     * Получает текущий баланс из графика на странице TradingView
     */
    public static async getCurrentBalance(): Promise<number> {
        try {
            const element = await this.waitForElement('[data-name="balance"]');
            return this.extractNumber(element?.textContent);
        } catch (error) {
            console.error('Error getting current balance:', error);
            return 0;
        }
    }

    /**
     * Получает текущую просадку из графика на странице TradingView
     */
    public static async getCurrentDrawdown(): Promise<number> {
        try {
            const element = await this.waitForElement('[data-name="drawdown"]');
            return this.extractNumber(element?.textContent);
        } catch (error) {
            console.error('Error getting current drawdown:', error);
            return 0;
        }
    }
}
