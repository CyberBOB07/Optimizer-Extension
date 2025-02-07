// Content script
console.log('TradingView Optimizer content script загружен');

// Функция для проверки текущей страницы
function checkCurrentPage(): string {
  const url = window.location.href;
  if (url.includes('chart')) return 'chart';
  if (url.includes('pine-script-editor')) return 'editor';
  return 'other';
}

// Функция для проверки, что мы на странице с графиком
function isChartPage(): boolean {
    return window.location.pathname.includes('/chart/') || 
           document.querySelector('.chart-container') !== null;
}

// Функция для ожидания загрузки элементов TradingView
function waitForTradingView(): Promise<void> {
    return new Promise((resolve) => {
        const check = () => {
            if (document.querySelector('.chart-container')) {
                resolve();
            } else {
                setTimeout(check, 1000);
            }
        };
        check();
    });
}

// Инициализация при загрузке страницы
async function initialize() {
  const pageType = checkCurrentPage();
  console.log('Тип страницы:', pageType);

  // Отправляем сообщение в background script
  chrome.runtime.sendMessage({ 
    type: 'PAGE_LOADED',
    pageType: pageType
  });
}

// Инициализация панели
async function initializePanel() {
    if (!isChartPage()) {
        return;
    }

    // Ждем загрузки графика
    await waitForTradingView();
    console.log('TradingView график загружен, инициализируем панель...');

    // Создаем панель оптимизатора
    const panel = new OptimizerPanel();
}

import { TradingViewParser } from './tradingview/parser';
import { TradingViewOptimizer, OptimizationParams } from './tradingview/optimizer';

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startOptimization') {
        handleOptimization(request.params, request.ranges)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
        return true; // Возвращаем true для асинхронного ответа
    }
    
    if (request.action === 'getCurrentResults') {
        getCurrentResults()
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }
});

// Обработка оптимизации
async function handleOptimization(
    params: OptimizationParams,
    ranges: { [key: string]: { min: number; max: number; step: number } }
) {
    try {
        console.log('Starting optimization with params:', params);
        console.log('Input ranges:', ranges);

        const result = await TradingViewOptimizer.optimize(params, ranges);
        
        if (!result) {
            throw new Error('Optimization failed - no valid results found');
        }

        console.log('Optimization completed. Best results:', result);
        
        // Применяем лучшие параметры
        await TradingViewOptimizer.applyBestParams(result.inputs);
        
        return {
            success: true,
            result
        };
    } catch (error) {
        console.error('Optimization error:', error);
        throw error;
    }
}

// Получение текущих результатов
async function getCurrentResults() {
    try {
        const results = await TradingViewParser.getStrategyResults();
        const trades = await TradingViewParser.getTrades();
        const balance = await TradingViewParser.getCurrentBalance();
        const drawdown = await TradingViewParser.getCurrentDrawdown();

        return {
            success: true,
            data: {
                results,
                trades,
                balance,
                drawdown
            }
        };
    } catch (error) {
        console.error('Error getting current results:', error);
        throw error;
    }
}

// Запускаем инициализацию
initialize();
initializePanel();

class OptimizerPanel {
    private container!: HTMLDivElement;
    private status!: HTMLDivElement;
    private params: {
        minProfit: number;
        maxDrawdown: number;
        minTrades: number;
        minWinRate: number;
    } = {
        minProfit: 0,
        maxDrawdown: 100,
        minTrades: 10,
        minWinRate: 50
    };
    private ranges: { [key: string]: { min: number; max: number; step: number } } = {};

    constructor() {
        this.createPanel();
        this.setupEventListeners();
    }

    private createPanel() {
        // Создаем контейнер
        this.container = document.createElement('div');
        this.container.id = 'tvso-control-panel';
        this.container.style.cssText = `
            position: absolute;
            top: 40px;
            right: 20px;
            background: white;
            border: 1px solid #e0e3eb;
            border-radius: 4px;
            padding: 16px;
            width: 300px;
            z-index: 999;
        `;

        // Создаем таблицу
        const table = document.createElement('table');
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
        `;

        // Заголовок
        const header = document.createElement('tr');
        header.innerHTML = `
            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e0e3eb;">Параметр</th>
            <th style="text-align: right; padding: 8px; border-bottom: 1px solid #e0e3eb;">Значение</th>
        `;
        table.appendChild(header);

        // Параметры оптимизации
        const paramsList = [
            { id: 'minProfit', label: 'Мин. прибыль', value: 0 },
            { id: 'maxDrawdown', label: 'Макс. просадка', value: 100 },
            { id: 'minTrades', label: 'Мин. сделок', value: 10 },
            { id: 'minWinRate', label: 'Мин. винрейт', value: 50 }
        ];

        paramsList.forEach(param => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 8px; border-bottom: 1px solid #e0e3eb;">${param.label}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e0e3eb;">
                    <input type="number" id="${param.id}" value="${param.value}" style="width: 80px; text-align: right;">
                </td>
            `;
            table.appendChild(row);
        });

        // Добавляем разделитель
        const divider = document.createElement('tr');
        divider.innerHTML = `
            <td colspan="2" style="padding: 8px; border-bottom: 1px solid #e0e3eb; font-weight: bold;">
                Диапазоны оптимизации
            </td>
        `;
        table.appendChild(divider);

        // Контейнер для диапазонов
        const rangesContainer = document.createElement('div');
        rangesContainer.id = 'ranges-container';
        rangesContainer.style.cssText = `
            margin-top: 8px;
            max-height: 200px;
            overflow-y: auto;
        `;

        // Кнопка добавления диапазона
        const addButton = document.createElement('button');
        addButton.textContent = 'Добавить диапазон';
        addButton.style.cssText = `
            margin-top: 8px;
            padding: 8px 16px;
            background: #2196f3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        addButton.onclick = () => this.addRange();

        // Кнопка запуска оптимизации
        const startButton = document.createElement('button');
        startButton.id = 'startOptimization';
        startButton.textContent = 'Запустить оптимизацию';
        startButton.style.cssText = `
            margin-top: 16px;
            padding: 8px 16px;
            background: #4caf50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
        `;
        startButton.onclick = () => this.startOptimization();

        // Статус
        this.status = document.createElement('div');
        this.status.style.cssText = `
            margin-top: 8px;
            padding: 8px;
            background: #f5f5f5;
            border-radius: 4px;
            text-align: center;
        `;

        // Добавляем все элементы в контейнер
        this.container.appendChild(table);
        this.container.appendChild(rangesContainer);
        this.container.appendChild(addButton);
        this.container.appendChild(startButton);
        this.container.appendChild(this.status);

        // Добавляем контейнер на страницу
        document.body.appendChild(this.container);

        // Делаем панель перетаскиваемой
        this.container.style.cursor = 'move';
        this.container.onmousedown = this.onMouseDown.bind(this);
    }

    private setupEventListeners() {
        // Обработчики для параметров оптимизации
        const paramInputs = ['minProfit', 'maxDrawdown', 'minTrades', 'minWinRate'];
        paramInputs.forEach(id => {
            const input = document.getElementById(id) as HTMLInputElement;
            input?.addEventListener('change', () => {
                this.params[id as keyof typeof this.params] = Number(input.value);
            });
        });
    }

    private addRange() {
        const rangesContainer = document.getElementById('ranges-container')!;
        const rangeId = `range-${Date.now()}`;
        
        const rangeEl = document.createElement('div');
        rangeEl.className = 'range-item';
        rangeEl.style.cssText = `
            margin-top: 8px;
            padding: 8px;
            background: #f5f5f5;
            border-radius: 4px;
        `;

        // Создаем таблицу для диапазона
        const table = document.createElement('table');
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
        `;

        // Заголовок с именем и кнопкой удаления
        const header = document.createElement('tr');
        header.innerHTML = `
            <td colspan="2" style="padding: 4px;">
                <input type="text" placeholder="Имя параметра" style="width: 80%;">
                <button class="remove-button" style="float: right; background: none; border: none; color: #f44336; cursor: pointer;">×</button>
            </td>
        `;
        table.appendChild(header);

        // Поля для диапазона
        const rangeInputs = [
            { id: 'min', label: 'Мин.' },
            { id: 'max', label: 'Макс.' },
            { id: 'step', label: 'Шаг' }
        ];

        rangeInputs.forEach(input => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 4px;">${input.label}</td>
                <td style="padding: 4px;">
                    <input type="number" class="${input.id}" style="width: 80px; text-align: right;">
                </td>
            `;
            table.appendChild(row);
        });

        rangeEl.appendChild(table);
        rangesContainer.appendChild(rangeEl);

        // Обработчик удаления
        const removeButton = rangeEl.querySelector('.remove-button') as HTMLButtonElement;
        removeButton.onclick = () => rangeEl.remove();

        // Обработчики для инпутов
        const nameInput = rangeEl.querySelector('input[type="text"]') as HTMLInputElement;
        const numberInputs = rangeEl.querySelectorAll('input[type="number"]');
        
        const updateRange = () => {
            const name = nameInput.value.trim();
            if (name) {
                this.ranges[name] = {
                    min: Number((rangeEl.querySelector('.min') as HTMLInputElement).value),
                    max: Number((rangeEl.querySelector('.max') as HTMLInputElement).value),
                    step: Number((rangeEl.querySelector('.step') as HTMLInputElement).value)
                };
            }
        };

        nameInput.addEventListener('change', updateRange);
        numberInputs.forEach(input => {
            input.addEventListener('change', updateRange);
        });
    }

    private async startOptimization() {
        const startButton = this.container.querySelector('#startOptimization') as HTMLButtonElement;
        startButton.disabled = true;
        this.status.textContent = 'Начинаем оптимизацию...';

        try {
            const result = await TradingViewOptimizer.optimize(this.params, this.ranges);

            if (!result) {
                this.status.textContent = 'Ошибка оптимизации';
                return;
            }

            this.status.textContent = 'Оптимизация завершена!';
            this.showResults(result);
        } catch (error) {
            this.status.textContent = 'Произошла ошибка: ' + (error as Error).message;
        } finally {
            startButton.disabled = false;
        }
    }

    private showResults(result: { inputs: { [key: string]: number }; results: any }) {
        // Создаем таблицу результатов
        const resultsTable = document.createElement('table');
        resultsTable.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
        `;

        // Заголовок результатов
        const header = document.createElement('tr');
        header.innerHTML = `
            <td colspan="2" style="padding: 8px; border-bottom: 1px solid #e0e3eb; font-weight: bold;">
                Результаты оптимизации
            </td>
        `;
        resultsTable.appendChild(header);

        // Метрики
        const metrics = [
            { label: 'Чистая прибыль', value: result.results.netProfit },
            { label: 'Макс. просадка', value: result.results.maxDrawdown },
            { label: 'Всего сделок', value: result.results.totalTrades },
            { label: 'Процент прибыльных', value: result.results.percentProfitable }
        ];

        metrics.forEach(metric => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 8px; border-bottom: 1px solid #e0e3eb;">${metric.label}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e0e3eb; text-align: right;">${metric.value}</td>
            `;
            resultsTable.appendChild(row);
        });

        // Оптимальные параметры
        const paramsHeader = document.createElement('tr');
        paramsHeader.innerHTML = `
            <td colspan="2" style="padding: 8px; border-bottom: 1px solid #e0e3eb; font-weight: bold;">
                Оптимальные параметры
            </td>
        `;
        resultsTable.appendChild(paramsHeader);

        Object.entries(result.inputs).forEach(([name, value]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 8px; border-bottom: 1px solid #e0e3eb;">${name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e0e3eb; text-align: right;">${value}</td>
            `;
            resultsTable.appendChild(row);
        });

        // Удаляем предыдущую таблицу результатов, если она есть
        const oldResults = this.container.querySelector('.results-table');
        if (oldResults) {
            oldResults.remove();
        }

        // Добавляем класс для идентификации
        resultsTable.className = 'results-table';
        this.container.appendChild(resultsTable);
    }

    private onMouseDown(event: MouseEvent) {
        const rect = this.container.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const moveHandler = (event: MouseEvent) => {
            const newX = event.clientX - x;
            const newY = event.clientY - y;

            this.container.style.top = `${newY}px`;
            this.container.style.left = `${newX}px`;
        };

        const upHandler = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
        };

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    }
}

// Обработка сообщений от popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Здесь будет обработка сообщений от popup
});
