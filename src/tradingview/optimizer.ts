import { StrategyResult, Trade, TradingViewParser } from './parser';

export interface OptimizationParams {
    minProfit: number;
    maxDrawdown: number;
    minTrades: number;
    minWinRate: number;
}

export class TradingViewOptimizer {
    // Селекторы для элементов ввода и кнопок
    private static readonly INPUT_WRAPPER_SELECTOR = '[data-name="input-wrapper"]';
    private static readonly INPUT_SELECTOR = '[data-name="input-control"]';
    private static readonly APPLY_BUTTON_SELECTOR = '[data-name="apply-button"]';

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
     * Проверяет, соответствуют ли результаты стратегии заданным параметрам
     */
    private static checkResults(results: StrategyResult, params: OptimizationParams): boolean {
        return (
            results.netProfit >= params.minProfit &&
            results.maxDrawdown <= params.maxDrawdown &&
            results.totalTrades >= params.minTrades &&
            results.percentProfitable >= params.minWinRate
        );
    }

    /**
     * Изменяет значение входного параметра стратегии
     */
    private static async setInputValue(inputName: string, value: number): Promise<void> {
        try {
            // Ждем загрузки контейнера с инпутами
            const wrapper = await this.waitForElement(this.INPUT_WRAPPER_SELECTOR);
            if (!wrapper) throw new Error('Input wrapper not found');

            // Находим нужный инпут по имени
            const input = wrapper.querySelector(
                `${this.INPUT_SELECTOR}[data-name="${inputName}"]`
            ) as HTMLInputElement;
            
            if (!input) {
                throw new Error(`Input not found: ${inputName}`);
            }

            // Устанавливаем значение и вызываем событие изменения
            input.value = value.toString();
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('input', { bubbles: true }));

            // Ждем появления кнопки применения
            const applyButton = await this.waitForElement(this.APPLY_BUTTON_SELECTOR);
            if (!applyButton) {
                throw new Error('Apply button not found');
            }

            // Кликаем по кнопке и ждем обновления графика
            (applyButton as HTMLElement).click();
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            console.error(`Error setting input value for ${inputName}:`, error);
            throw error;
        }
    }

    /**
     * Оптимизирует стратегию перебором параметров
     */
    public static async optimize(
        params: OptimizationParams,
        inputRanges: { [key: string]: { min: number; max: number; step: number } }
    ): Promise<{ inputs: { [key: string]: number }; results: StrategyResult } | null> {
        try {
            let bestResults: StrategyResult | null = null;
            let bestInputs: { [key: string]: number } = {};

            // Перебираем все комбинации входных параметров
            for (const [inputName, range] of Object.entries(inputRanges)) {
                for (let value = range.min; value <= range.max; value += range.step) {
                    try {
                        await this.setInputValue(inputName, value);
                        
                        // Ждем обновления результатов
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        const results = await TradingViewParser.getStrategyResults();
                        if (!results) continue;

                        if (!bestResults || (
                            this.checkResults(results, params) &&
                            results.netProfit > (bestResults?.netProfit || 0)
                        )) {
                            bestResults = results;
                            bestInputs[inputName] = value;
                        }
                    } catch (iterationError) {
                        console.warn(`Error during iteration for ${inputName}=${value}:`, iterationError);
                        continue;
                    }
                }
            }

            return bestResults ? { inputs: bestInputs, results: bestResults } : null;
        } catch (error) {
            console.error('Error during optimization:', error);
            return null;
        }
    }

    /**
     * Применяет лучшие найденные параметры
     */
    public static async applyBestParams(inputs: { [key: string]: number }): Promise<void> {
        try {
            for (const [inputName, value] of Object.entries(inputs)) {
                await this.setInputValue(inputName, value);
            }
        } catch (error) {
            console.error('Error applying best params:', error);
            throw error;
        }
    }
}
