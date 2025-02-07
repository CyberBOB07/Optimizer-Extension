// Глобальные переменные для отслеживания состояния
let isUpdating = false;
let updateQueue = false;

// Функция создания информационного окна
function createInfoWindow() {
    if (infoWindow) {
        console.log('Window already exists, skipping creation');
        return infoWindow;
    }

    console.log('Creating new info window');
    const window = document.createElement('div');
    window.className = 'tv-optimizer-window';
    window.style.cssText = `
        position: fixed;
        top: 50px;
        right: 50px;
        background: #131722;
        color: #d1d4dc;
        border: 1px solid #363c4e;
        border-radius: 3px;
        padding: 8px;
        z-index: 999;
        min-width: 200px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        user-select: none;
    `;
    
    document.body.appendChild(window);
    infoWindow = window;
    makeWindowDraggable(window);
    
    // Обновляем содержимое окна после его создания
    setTimeout(() => updateInfoWindow(window), 0);
    
    return window;
}

// Функция обновления содержимого окна
function updateInfoWindow(window = infoWindow) {
    if (!window) {
        console.log('No window to update');
        return;
    }

    // Защита от рекурсии
    if (isUpdating) {
        console.log('Already updating, queuing next update');
        updateQueue = true;
        return;
    }

    try {
        isUpdating = true;
        console.log('Updating info window');
        
        const info = getTradingInfo();
        const results = parseBacktestResults();

        // Создаем новый div для контента
        const content = document.createElement('div');
        content.className = 'content';
        content.innerHTML = `
            <div style="margin-bottom: 4px; color: #d1d4dc;">TradingView Optimizer</div>
            <div style="font-size: 11px; opacity: 0.8; color: #787b86;">
                <div>Symbol: ${info.symbol}</div>
                <div>Interval: ${info.interval}</div>
                <div>Settings: ${isStrategySettingsDetected ? '✅' : '❌'}</div>
                <div>Tracking: ${isTrackingMode ? '🔍' : '⏸️'}</div>
            </div>
            ${!isStrategySettingsDetected ? `
                <button class="tv-optimizer-button" id="detectButton" style="
                    background: #2962ff;
                    color: #fff;
                    border: none;
                    border-radius: 2px;
                    padding: 4px 8px;
                    margin-top: 8px;
                    cursor: pointer;
                    font-size: 11px;
                    width: 100%;
                ">Detect Settings Button</button>
            ` : `
                <button class="tv-optimizer-button" id="openButton" style="
                    background: #2962ff;
                    color: #fff;
                    border: none;
                    border-radius: 2px;
                    padding: 4px 8px;
                    margin-top: 8px;
                    cursor: pointer;
                    font-size: 11px;
                    width: 100%;
                ">Open Strategy Settings</button>
            `}
            ${results ? `
                <div style="margin-top: 8px; border-top: 1px solid #363c4e; padding-top: 8px;">
                    <div style="margin-bottom: 4px;">Backtest Results:</div>
                    <div style="font-size: 11px;">
                        <div>Net Profit: <span class="${getValueClass(results.netProfit)}">${formatUSDT(results.netProfit)} (${formatPercent(results.netProfitPercent)})</span></div>
                        <div>Total Trades: ${results.totalTrades}</div>
                        <div>Percent Profitable: ${formatPercent(results.percentProfitable)}</div>
                        <div>Profit Factor: ${formatNumber(results.profitFactor)}</div>
                        <div>Max Drawdown: ${formatUSDT(results.maxDrawdown)} (${formatPercent(results.maxDrawdownPercent)})</div>
                        <div>Avg Trade: ${formatUSDT(results.avgTrade)} (${formatPercent(results.avgTradePercent)})</div>
                        <div>Avg # Bars: ${results.avgBarsInTrade}</div>
                    </div>
                </div>
            ` : ''}
        `;

        // Очищаем окно и добавляем новый контент
        window.innerHTML = '';
        window.appendChild(content);

        // Добавляем обработчики для кнопок
        if (!isStrategySettingsDetected) {
            const detectButton = window.querySelector('#detectButton');
            if (detectButton) {
                detectButton.addEventListener('click', detectStrategySettings);
            }
        } else {
            const openButton = window.querySelector('#openButton');
            if (openButton) {
                openButton.addEventListener('click', openStrategySettings);
            }
        }
    } finally {
        isUpdating = false;
        if (updateQueue) {
            updateQueue = false;
            updateInfoWindow();
        }
    }
}

// Функция получения информации о торговле
function getTradingInfo() {
    try {
        // Селектор для символа: кнопка с текущим символом в верхнем тулбаре
        const symbolElement = document.querySelector('[data-name="legend-series-item"] [data-name="legend-source-title"]');
        
        // Селектор для интервала: кнопка с текущим интервалом
        const intervalElement = document.querySelector('button.title-l31H9iuA.accessible-l31H9iuA[aria-label="Change interval"]');
        
        return {
            symbol: symbolElement ? symbolElement.textContent.trim() : 'Не определен',
            interval: intervalElement ? intervalElement.textContent.trim() : 'Не определен'
        };
    } catch (error) {
        console.error('Ошибка получения данных:', error);
        return {
            symbol: 'Ошибка',
            interval: 'Ошибка'
        };
    }
}

// Глобальные переменные
let infoWindow = null;
let isTrackingMode = false;
let isStrategySettingsDetected = false;
let strategySettingsSelector = '';
let strategyButtonIndex = -1;
const DEFAULT_SETTINGS_BUTTON_SELECTOR = 'button[title="Settings"].apply-common-tooltip';

// Структура для хранения результатов бэктеста
let backtestResults = {
    netProfit: null,
    netProfitPercent: null,
    totalTrades: null,
    percentProfitable: null,
    profitFactor: null,
    maxDrawdown: null,
    maxDrawdownPercent: null,
    avgTrade: null,
    avgTradePercent: null,
    avgBarsInTrade: null
};

// Функция парсинга результатов бэктеста
function parseBacktestResults() {
    const container = document.querySelector('.container-Yvm0jjs7');
    if (!container) {
        console.log('Container not found');
        return null;
    }

    try {
        // Находим все ячейки с данными
        const cells = container.querySelectorAll('.containerCell-Yvm0jjs7');
        if (!cells || cells.length === 0) {
            console.log('No cells found');
            return null;
        }

        const results = {};
        
        cells.forEach(cell => {
            const title = cell.querySelector('.title-Yvm0jjs7')?.textContent;
            const value = cell.querySelector('.secondRow-Yvm0jjs7 div:first-child')?.textContent;
            const additionalPercent = cell.querySelector('.additionalPercent-Yvm0jjs7')?.textContent;
            
            if (title && value) {
                switch (title.trim()) {
                    case 'Net Profit':
                        results.netProfit = parseFloat(value.replace(/[^0-9.-]/g, ''));
                        if (additionalPercent) {
                            results.netProfitPercent = parseFloat(additionalPercent.replace(/[^0-9.-]/g, ''));
                        }
                        break;
                    case 'Total Closed Trades':
                        results.totalTrades = parseInt(value);
                        break;
                    case 'Percent Profitable':
                        results.percentProfitable = parseFloat(value.replace('%', ''));
                        break;
                    case 'Profit Factor':
                        results.profitFactor = parseFloat(value);
                        break;
                    case 'Max Drawdown':
                        results.maxDrawdown = parseFloat(value.replace(/[^0-9.-]/g, ''));
                        if (additionalPercent) {
                            results.maxDrawdownPercent = parseFloat(additionalPercent.replace(/[^0-9.-]/g, ''));
                        }
                        break;
                    case 'Avg Trade':
                        results.avgTrade = parseFloat(value.replace(/[^0-9.-]/g, ''));
                        if (additionalPercent) {
                            results.avgTradePercent = parseFloat(additionalPercent.replace(/[^0-9.-]/g, ''));
                        }
                        break;
                    case 'Avg # Bars in Trades':
                        results.avgBarsInTrade = parseFloat(value);
                        break;
                }
            }
        });

        // Проверяем, что у нас есть хотя бы основные результаты
        if (results.netProfit !== undefined && results.totalTrades !== undefined) {
            console.log('Results parsed successfully:', results);
            return results;
        }

        console.log('Not all required results found');
        return null;
    } catch (error) {
        console.error('Error parsing results:', error);
        return null;
    }
}

function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '—';
    return num.toFixed(decimals);
}

function formatPercent(num) {
    if (num === null || num === undefined || isNaN(num)) return '—';
    return `${num.toFixed(2)}%`;
}

function formatUSDT(num) {
    if (num === null || num === undefined || isNaN(num)) return '—';
    return `${num.toFixed(2)} USDT`;
}

function getValueClass(num) {
    if (num === null || num === undefined || isNaN(num)) return '';
    return num > 0 ? 'positive' : num < 0 ? 'negative' : '';
}

// Функция проверки доступности кнопки настроек
function checkDefaultSettingsButton() {
    console.log('Checking default settings button');
    const defaultButton = document.querySelector(DEFAULT_SETTINGS_BUTTON_SELECTOR);
    console.log('Default button found:', defaultButton);
    
    if (defaultButton) {
        // Сохраняем эту кнопку как основную
        strategySettingsSelector = DEFAULT_SETTINGS_BUTTON_SELECTOR;
        strategyButtonIndex = 0; // Эта кнопка всегда одна
        isStrategySettingsDetected = true;
        
        // Сохраняем в storage
        chrome.storage.local.set({
            strategySettingsDetected: true,
            strategySettingsSelector: strategySettingsSelector,
            strategyButtonIndex: strategyButtonIndex
        }, () => {
            console.log('Default settings button saved');
            updateInfoWindow();
        });
        
        return true;
    }
    
    return false;
}

// Функция для открытия настроек стратегии
function openStrategySettings() {
    console.log('Trying to open strategy settings');
    
    // Пробуем найти кнопку по основному селектору
    const defaultButton = document.querySelector(DEFAULT_SETTINGS_BUTTON_SELECTOR);
    console.log('Default settings button:', defaultButton);
    
    if (defaultButton) {
        console.log('Using default settings button');
        simulateClick(defaultButton);
        return true;
    }
    
    // Если не нашли, используем сохраненную кнопку
    if (strategySettingsSelector && strategySettingsSelector !== DEFAULT_SETTINGS_BUTTON_SELECTOR) {
        console.log('Trying to find settings button with selector:', strategySettingsSelector, 'index:', strategyButtonIndex);
        const allButtons = Array.from(document.querySelectorAll(strategySettingsSelector));
        console.log('Found buttons:', allButtons.length);
        
        if (allButtons.length > strategyButtonIndex) {
            const settingsButton = allButtons[strategyButtonIndex];
            console.log('Using saved button:', settingsButton);
            simulateClick(settingsButton);
            return true;
        }
    }
    
    // Если не нашли ни одну кнопку, показываем сообщение и включаем отслеживание
    showNotification('Кнопка не найдена. Включаю режим отслеживания ');
    toggleTrackingMode(true);
    return false;
}

// Функция сброса настроек
function resetSettings() {
    console.log('Resetting settings');
    isStrategySettingsDetected = false;
    strategySettingsSelector = '';
    strategyButtonIndex = -1;
    
    // Сохраняем новое состояние
    chrome.storage.local.set({
        strategySettingsDetected: false,
        strategySettingsSelector: '',
        strategyButtonIndex: -1
    }, () => {
        console.log('Settings reset');
        showNotification('Настройки сброшены ');
        // Пересоздаем окно
        if (infoWindow) {
            document.body.removeChild(infoWindow);
        }
        createInfoWindow();
    });
}

// Функция для симуляции клика
function simulateClick(element) {
    console.log('Simulating click on element:', element);
    
    // Пробуем разные способы клика
    try {
        // 1. Создаем и диспатчим событие click
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        element.dispatchEvent(clickEvent);
        
        // 2. Если не сработало, пробуем mousedown/mouseup
        const mouseDownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        const mouseUpEvent = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        element.dispatchEvent(mouseDownEvent);
        element.dispatchEvent(mouseUpEvent);
        
        // 3. Пробуем программный клик
        element.click();
        
    } catch (error) {
        console.error('Error simulating click:', error);
    }
}

// Функция для перетаскивания окна
function makeWindowDraggable(window) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    
    function dragStart(e) {
        if (e.type === "touchstart") {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }
        
        if (e.target === window) {
            isDragging = true;
        }
    }
    
    function dragEnd() {
        if (!isDragging) return;
        
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
        
        // Сохраняем позицию
        chrome.storage.local.set({
            windowPosition: {
                top: window.style.top,
                right: window.style.right
            }
        });
    }
    
    function drag(e) {
        if (!isDragging) return;
        
        e.preventDefault();
        
        if (e.type === "touchmove") {
            currentX = e.touches[0].clientX - initialX;
            currentY = e.touches[0].clientY - initialY;
        } else {
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
        }
        
        xOffset = currentX;
        yOffset = currentY;
        window.style.transform = `translate(${currentX}px, ${currentY}px)`;
    }
    
    window.addEventListener("touchstart", dragStart, false);
    window.addEventListener("touchend", dragEnd, false);
    window.addEventListener("touchmove", drag, false);
    window.addEventListener("mousedown", dragStart, false);
    window.addEventListener("mouseup", dragEnd, false);
    window.addEventListener("mousemove", drag, false);
}

// Функции управления окном
function showInfoWindow() {
    console.log('Showing info window');
    if (!infoWindow) {
        const window = createInfoWindow();
        if (window) {
            console.log('Window created successfully');
            // Запускаем ожидание результатов после создания окна
            waitForBacktestResults();
        }
    } else {
        console.log('Window already exists, updating');
        updateInfoWindow();
    }
}

function hideInfoWindow() {
    console.log('Hiding info window');
    if (infoWindow) {
        // Останавливаем все наблюдатели
        cleanupObservers();
        infoWindow.remove();
        infoWindow = null;
    }
}

// Функция для включения/выключения режима отслеживания
function toggleTrackingMode(enable) {
    console.log('toggleTrackingMode:', enable);
    isTrackingMode = enable;
    
    if (enable) {
        // Добавляем обработчики на все этапы клика
        document.addEventListener('mousedown', detectStrategySettings, true);
        document.addEventListener('mouseup', detectStrategySettings, true);
        document.addEventListener('click', detectStrategySettings, true);
        showNotification('Нажмите кнопку настроек стратегии ');
    } else {
        // Удаляем все обработчики
        document.removeEventListener('mousedown', detectStrategySettings, true);
        document.removeEventListener('mouseup', detectStrategySettings, true);
        document.removeEventListener('click', detectStrategySettings, true);
        showNotification('Отслеживание отменено ');
    }
    
    updateInfoWindow();
}

// Функция для отслеживания клика по кнопке настроек
function detectStrategySettings(event) {
    console.log('detectStrategySettings called, tracking mode:', isTrackingMode);
    
    if (!isTrackingMode) return;
    
    const target = event.target;
    console.log('Click target:', target);
    console.log('Target attributes:', {
        class: target.className,
        dataName: target.getAttribute('data-name'),
        role: target.getAttribute('role'),
        ariaLabel: target.getAttribute('aria-label'),
        innerHTML: target.innerHTML
    });
    
    // Ищем кнопку настроек по разным селекторам
    const settingsButton = target.closest('button.lightButton-bYDQcOkp.ghost-PVWoXu5j.gray-PVWoXu5j, [data-name="legend-settings-action"]');
    console.log('Found settings button:', settingsButton);
    
    if (settingsButton) {
        // Полностью останавливаем событие на этапе перехвата
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        event.returnValue = false;
        
        // Сохраняем селектор
        if (settingsButton.matches('button.lightButton-bYDQcOkp.ghost-PVWoXu5j.gray-PVWoXu5j')) {
            strategySettingsSelector = 'button.lightButton-bYDQcOkp.ghost-PVWoXu5j.gray-PVWoXu5j';
        } else {
            strategySettingsSelector = '[data-name="legend-settings-action"]';
        }
        
        // Находим индекс кнопки
        const allButtons = Array.from(document.querySelectorAll(strategySettingsSelector));
        const buttonIndex = allButtons.indexOf(settingsButton);
        console.log('Button index:', buttonIndex, 'of', allButtons.length, 'buttons');
        strategyButtonIndex = buttonIndex;
        
        console.log('Using selector:', strategySettingsSelector, 'with index:', strategyButtonIndex);
        
        // Сначала отключаем отслеживание
        isTrackingMode = false;
        document.removeEventListener('mousedown', detectStrategySettings, true);
        document.removeEventListener('mouseup', detectStrategySettings, true);
        document.removeEventListener('click', detectStrategySettings, true);
        
        // Затем сохраняем информацию и обновляем состояние
        console.log('Setting isStrategySettingsDetected to true');
        isStrategySettingsDetected = true;
        
        // Принудительно пересоздаем окно
        console.log('Recreating info window...');
        if (infoWindow) {
            document.body.removeChild(infoWindow);
        }
        createInfoWindow();
        
        // И только потом сохраняем в storage
        chrome.storage.local.set({
            strategySettingsDetected: true,
            strategySettingsSelector: strategySettingsSelector,
            strategyButtonIndex: strategyButtonIndex
        }, () => {
            console.log('Settings saved to storage');
            showNotification('Кнопка настроек успешно определена! ');
        });
        
        return false;
    }
}

// Функция для показа уведомления
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #131722;
        color: #d1d4dc;
        padding: 10px 20px;
        border-radius: 4px;
        z-index: 9999;
        border: 1px solid #363c4e;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    
    if (request.type === 'GET_TRADING_INFO') {
        sendResponse(getTradingInfo());
    } else if (request.type === 'TOGGLE_INFO_WINDOW') {
        console.log('Toggle info window:', request.show);
        try {
            if (request.show) {
                showInfoWindow();
            } else {
                hideInfoWindow();
            }
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error toggling window:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    return true;
});

// При инициализации восстанавливаем сохраненные данные
chrome.storage.local.get(['strategyButtonIndex', 'strategySettingsDetected', 'strategySettingsSelector', 'showInfoWindow'], (result) => {
    console.log('Loaded storage:', result);
    
    if (result.strategySettingsDetected) {
        isStrategySettingsDetected = true;
        strategySettingsSelector = result.strategySettingsSelector;
        strategyButtonIndex = result.strategyButtonIndex;
        console.log('Restored settings selector:', strategySettingsSelector, 'with index:', strategyButtonIndex);
    }
    
    // Создаем информационное окно только если оно должно быть показано
    const showWindow = result.showInfoWindow !== undefined ? result.showInfoWindow : true;
    if (showWindow) {
        showInfoWindow();
    }
    
    // Запускаем наблюдение за результатами бэктеста
    waitForBacktestResults();
    
    // Запоминаем текущий URL и символ
    let lastUrl = location.href;
    let lastSymbol = '';
    let lastInterval = '';

    // Слушаем изменения URL и символа
    function checkChanges() {
        const currentUrl = location.href;
        const info = getTradingInfo();
        
        // Проверяем изменение URL
        if (currentUrl !== lastUrl) {
            console.log('URL changed:', currentUrl);
            lastUrl = currentUrl;
            
            // Перезапускаем наблюдение за результатами и проверку кнопки
            if (!isStrategySettingsDetected) {
                setTimeout(checkDefaultSettingsButton, 2000);
            }
            waitForBacktestResults();
        }
        
        // Проверяем изменение символа или интервала
        if (info.symbol !== lastSymbol || info.interval !== lastInterval) {
            console.log('Symbol or interval changed:', info.symbol, info.interval);
            lastSymbol = info.symbol;
            lastInterval = info.interval;
            
            // Обновляем окно если оно существует
            if (infoWindow) {
                updateInfoWindow();
            }
        }
    }

    // Запускаем периодическую проверку изменений
    setInterval(checkChanges, 1000);
});

// При загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking settings button');
    
    // Даем странице время загрузиться полностью
    setTimeout(() => {
        if (!isStrategySettingsDetected) {
            checkDefaultSettingsButton();
        }
    }, 2000);
});

// Периодически проверяем наличие кнопки
setInterval(() => {
    if (!isStrategySettingsDetected) {
        checkDefaultSettingsButton();
    }
}, 5000);

// Функция инициализации
function init() {
    console.log('Initializing TradingView Optimizer...');
    
    chrome.storage.local.get(['strategyButtonIndex', 'strategySettingsDetected', 'strategySettingsSelector', 'showInfoWindow'], (result) => {
        console.log('Loaded storage:', result);
        
        if (result.strategySettingsDetected) {
            isStrategySettingsDetected = true;
            strategySettingsSelector = result.strategySettingsSelector;
            strategyButtonIndex = result.strategyButtonIndex;
            console.log('Restored settings selector:', strategySettingsSelector, 'with index:', strategyButtonIndex);
        }
        
        // Создаем информационное окно только если оно должно быть показано
        const showWindow = result.showInfoWindow !== undefined ? result.showInfoWindow : true;
        if (showWindow) {
            showInfoWindow();
        }
        
        // Запускаем наблюдение за результатами бэктеста
        waitForBacktestResults();
        
        // Запускаем проверку кнопки настроек
        if (!isStrategySettingsDetected) {
            setTimeout(checkDefaultSettingsButton, 2000);
        }
    });
}

// Запускаем инициализацию
init();

// Функция ожидания результатов бэктеста
let backtestObserver = null;
let resultsCheckInterval = null;
let containerSearchInterval = null;

function waitForBacktestResults() {
    // Очищаем предыдущий интервал если есть
    if (resultsCheckInterval) {
        clearInterval(resultsCheckInterval);
        resultsCheckInterval = null;
    }

    console.log('Starting to wait for backtest results');
    resultsCheckInterval = setInterval(() => {
        // Проверяем наличие контейнера с результатами
        const container = document.querySelector('.container-Yvm0jjs7');
        if (!container) {
            console.log('Waiting for container...');
            return;
        }

        // Проверяем, что контейнер видим
        if (container.offsetParent === null) {
            console.log('Container is hidden, waiting...');
            return;
        }

        // Проверяем, загружены ли результаты
        const results = parseBacktestResults();
        if (results) {
            console.log('Backtest results found:', results);
            clearInterval(resultsCheckInterval);
            resultsCheckInterval = null;

            // Запускаем наблюдение за изменениями
            startBacktestObserver();
            
            // Обновляем окно с результатами
            if (infoWindow) {
                updateInfoWindow();
            }
        } else {
            console.log('Results not ready yet...');
        }
    }, 500); // Проверяем каждые 500мс

    // Останавливаем проверку через 10 секунд если результаты не найдены
    setTimeout(() => {
        if (resultsCheckInterval) {
            console.log('Timeout waiting for backtest results');
            clearInterval(resultsCheckInterval);
            resultsCheckInterval = null;
        }
    }, 10000);
}

function startBacktestObserver() {
    // Очищаем предыдущие интервалы
    if (containerSearchInterval) {
        clearInterval(containerSearchInterval);
        containerSearchInterval = null;
    }
    if (backtestObserver) {
        backtestObserver.disconnect();
        backtestObserver = null;
    }

    console.log('Starting backtest observer');
    
    // Функция для наблюдения за значениями
    const startValuesObserver = (container) => {
        if (!container) return;

        // Находим все элементы со значениями
        const valueElements = container.querySelectorAll('.positiveValue-Yvm0jjs7, .negativeValue-Yvm0jjs7, .additionalPercent-Yvm0jjs7');
        console.log('Found value elements:', valueElements.length);

        if (backtestObserver) {
            backtestObserver.disconnect();
        }

        backtestObserver = new MutationObserver((mutations) => {
            let needsUpdate = false;
            
            for (const mutation of mutations) {
                if (mutation.type === 'characterData') {
                    const targetElement = mutation.target.parentElement;
                    if (targetElement && (
                        targetElement.classList.contains('positiveValue-Yvm0jjs7') ||
                        targetElement.classList.contains('negativeValue-Yvm0jjs7') ||
                        targetElement.classList.contains('additionalPercent-Yvm0jjs7')
                    )) {
                        console.log('Value changed:', {
                            element: targetElement.className,
                            oldValue: mutation.oldValue,
                            newValue: mutation.target.textContent
                        });
                        needsUpdate = true;
                    }
                }
            }

            if (needsUpdate && infoWindow) {
                console.log('Updating info window due to value changes');
                updateResults();
            }
        });

        // Наблюдаем за изменениями текста во всех элементах со значениями
        valueElements.forEach(element => {
            backtestObserver.observe(element, {
                characterData: true,
                characterDataOldValue: true,
                subtree: true
            });
        });

        // Наблюдаем за изменениями в контейнере для отслеживания новых значений
        backtestObserver.observe(container, {
            childList: true,
            subtree: true
        });

        // Запускаем первичное обновление
        updateResults();
    };

    // Функция обновления результатов
    const updateResults = () => {
        const results = parseBacktestResults();
        if (results && infoWindow) {
            console.log('Updating results:', results);
            updateInfoWindow();
        }
    };

    // Функция поиска и наблюдения за контейнером
    const findAndObserveContainer = () => {
        const container = document.querySelector('.container-Yvm0jjs7');
        if (container) {
            console.log('Found backtest results container');
            startValuesObserver(container);
            return true;
        }
        console.log('Container not found');
        return false;
    };

    // Запускаем интервал поиска и обновления
    containerSearchInterval = setInterval(() => {
        const container = document.querySelector('.container-Yvm0jjs7');
        if (container) {
            // Если контейнер существует, проверяем обновились ли данные
            const results = parseBacktestResults();
            if (results) {
                console.log('Container exists, checking for updates');
                updateResults();
            }
        } else {
            // Если контейнер не существует, пытаемся найти его
            console.log('Searching for container...');
            findAndObserveContainer();
        }
    }, 500);

    // Первая попытка поиска
    findAndObserveContainer();
}

function cleanupObservers() {
    if (backtestObserver) {
        backtestObserver.disconnect();
        backtestObserver = null;
    }
    if (containerSearchInterval) {
        clearInterval(containerSearchInterval);
        containerSearchInterval = null;
    }
}
