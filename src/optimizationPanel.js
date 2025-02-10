// Панель выбора параметров для оптимизации

class OptimizationPanel {
    constructor() {
        this.selectedParams = new Set();
        this.container = null;
        this.settings = null;
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .optimization-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 300px;
                background: #1e222d;
                border: 1px solid #363c4e;
                border-radius: 4px;
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            .optimization-header {
                padding: 10px;
                border-bottom: 1px solid #363c4e;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .optimization-header h3 {
                margin: 0;
                color: #d1d4dc;
                font-size: 14px;
                font-weight: 600;
            }
            .optimization-close {
                background: none;
                border: none;
                color: #d1d4dc;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .optimization-close:hover {
                color: #ffffff;
            }
            .optimization-content {
                max-height: 400px;
                overflow-y: auto;
                padding: 10px;
            }
            .param-item {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                padding: 5px;
                border: 1px solid transparent;
                border-radius: 4px;
            }
            .param-item:hover {
                border-color: #363c4e;
                background: rgba(54, 60, 78, 0.3);
            }
            .param-item label {
                margin-left: 8px;
                color: #d1d4dc;
                flex-grow: 1;
                font-size: 13px;
            }
            .param-item input[type="checkbox"] {
                width: 16px;
                height: 16px;
                margin: 0;
            }
            .param-range {
                display: none;
                margin-top: 5px;
                padding-left: 25px;
            }
            .param-item.selected .param-range {
                display: block;
            }
            .param-range input[type="number"] {
                background: #2a2e39;
                border: 1px solid #363c4e;
                color: #d1d4dc;
                padding: 4px 8px;
                border-radius: 4px;
                width: 80px;
                margin: 2px 0;
            }
            .param-range label {
                display: flex;
                align-items: center;
            }
            .param-range label span {
                width: 40px;
                color: #787b86;
            }
            .optimization-footer {
                padding: 10px;
                border-top: 1px solid #363c4e;
                text-align: right;
            }
            .optimization-apply {
                background: #2962ff;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
            }
            .optimization-apply:hover {
                background: #1e4bd8;
            }
            .backtest-results {
                margin-top: 10px;
                padding: 10px;
                border-top: 1px solid #363c4e;
            }
            .backtest-results h4 {
                margin: 0 0 8px 0;
                color: #d1d4dc;
                font-size: 13px;
                font-weight: 600;
            }
            .result-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
                font-size: 12px;
            }
            .result-item .label {
                color: #787b86;
            }
            .result-item .value {
                color: #d1d4dc;
                font-family: 'Consolas', monospace;
            }
            .result-item .value.positive {
                color: #089981;
            }
            .result-item .value.negative {
                color: #f23645;
            }
        `;
        document.head.appendChild(style);
    }

    createContainer() {
        // Создаем контейнер для панели
        const container = document.createElement('div');
        container.className = 'optimization-panel';
        container.innerHTML = `
            <div class="optimization-header">
                <h3>Параметры оптимизации</h3>
                <button class="optimization-close">×</button>
            </div>
            <div class="optimization-content">
                <div class="params-list"></div>
            </div>
            <div class="optimization-footer">
                <button class="optimization-apply">Применить</button>
            </div>
        `;
        return container;
    }

    createParamItem(param) {
        const div = document.createElement('div');
        div.className = 'param-item';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = param.name;
        input.addEventListener('change', () => this.toggleParam(param.name));

        const label = document.createElement('label');
        label.htmlFor = param.name;
        label.textContent = param.label || param.name;

        div.appendChild(input);
        div.appendChild(label);

        // Добавляем поля для настройки диапазона оптимизации
        if (param.type === 'number') {
            const range = document.createElement('div');
            range.className = 'param-range';
            range.innerHTML = `
                <div>
                    <label><span>От:</span> <input type="number" class="range-min" value="${param.min || param.value}" 
                        min="${param.min}" max="${param.max}" step="${param.step || 1}"></label>
                </div>
                <div>
                    <label><span>До:</span> <input type="number" class="range-max" value="${param.max || param.value}" 
                        min="${param.min}" max="${param.max}" step="${param.step || 1}"></label>
                </div>
                <div>
                    <label><span>Шаг:</span> <input type="number" class="range-step" value="${param.step || 1}" 
                        min="${param.step || 1}" max="${(param.max - param.min) / 2 || 1}" step="${param.step || 1}"></label>
                </div>
            `;
            div.appendChild(range);
        }

        return div;
    }

    toggleParam(paramName) {
        const item = document.querySelector(`.param-item:has(#${paramName})`);
        if (this.selectedParams.has(paramName)) {
            this.selectedParams.delete(paramName);
            item.classList.remove('selected');
        } else {
            this.selectedParams.add(paramName);
            item.classList.add('selected');
        }
    }

    updateParamsList(settings) {
        this.settings = settings;
        const paramsList = this.container.querySelector('.params-list');
        paramsList.innerHTML = '';

        // Добавляем числовые параметры
        settings.inputs.filter(input => input.type === 'number').forEach(param => {
            paramsList.appendChild(this.createParamItem(param));
        });

        // Добавляем селекты
        settings.selects.forEach(param => {
            paramsList.appendChild(this.createParamItem(param));
        });
    }

    getOptimizationParams() {
        const params = [];
        this.selectedParams.forEach(paramName => {
            const paramItem = document.querySelector(`.param-item:has(#${paramName})`);
            const param = {
                name: paramName,
                type: 'number'
            };

            // Получаем настройки диапазона для числовых параметров
            const rangeDiv = paramItem.querySelector('.param-range');
            if (rangeDiv) {
                param.min = parseFloat(rangeDiv.querySelector('.range-min').value);
                param.max = parseFloat(rangeDiv.querySelector('.range-max').value);
                param.step = parseFloat(rangeDiv.querySelector('.range-step').value);
            }

            params.push(param);
        });
        return params;
    }

    /**
     * Обновляет результаты бектеста в панели
     * @param {Object} results - результаты бектеста
     */
    updateBacktestResults(results) {
        let resultsContainer = this.container.querySelector('.backtest-results');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.className = 'backtest-results';
            this.container.querySelector('.optimization-content').appendChild(resultsContainer);
        }

        const formatNumber = (num, decimals = 2) => {
            if (typeof num !== 'number') return '0';
            return num.toFixed(decimals);
        };

        const formatPercent = (num) => `${formatNumber(num)}%`;
        const formatUSDT = (num) => `${formatNumber(num)} USDT`;

        const getValueClass = (num) => {
            if (num > 0) return 'value positive';
            if (num < 0) return 'value negative';
            return 'value';
        };

        resultsContainer.innerHTML = `
            <h4>Результаты бектеста</h4>
            <div class="result-item">
                <span class="label">Чистая прибыль:</span>
                <span class="${getValueClass(results.netProfit)}">${formatUSDT(results.netProfit)}</span>
            </div>
            <div class="result-item">
                <span class="label">Всего сделок:</span>
                <span class="value">${results.totalTrades}</span>
            </div>
            <div class="result-item">
                <span class="label">Прибыльных:</span>
                <span class="value">${formatPercent(results.percentProfitable)}</span>
            </div>
            <div class="result-item">
                <span class="label">Профит-фактор:</span>
                <span class="${getValueClass(results.profitFactor - 1)}">${formatNumber(results.profitFactor)}</span>
            </div>
            <div class="result-item">
                <span class="label">Макс. просадка:</span>
                <span class="${getValueClass(-results.maxDrawdown)}">${formatUSDT(results.maxDrawdown)}</span>
            </div>
            <div class="result-item">
                <span class="label">Средняя сделка:</span>
                <span class="${getValueClass(results.avgTrade)}">${formatUSDT(results.avgTrade)}</span>
            </div>
            <div class="result-item">
                <span class="label">Ср. баров в сделке:</span>
                <span class="value">${formatNumber(results.avgBarsInTrade, 0)}</span>
            </div>
        `;
    }

    show(settings) {
        if (!this.container) {
            this.container = this.createContainer();
            document.body.appendChild(this.container);

            // Обработчики событий
            this.container.querySelector('.optimization-close').addEventListener('click', () => {
                this.container.style.display = 'none';
            });

            this.container.querySelector('.optimization-apply').addEventListener('click', () => {
                const params = this.getOptimizationParams();
                console.log('Выбранные параметры для оптимизации:', params);
                // Здесь можно добавить callback для дальнейшей обработки
            });
        }

        this.updateParamsList(settings);
        this.container.style.display = 'block';
    }
}

export const optimizationPanel = new OptimizationPanel();
