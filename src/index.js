// Функция создания информационного окна
function createInfoWindow() {
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
    updateInfoWindow(window);
    makeWindowDraggable(window);
    
    return window;
}

// Функция обновления содержимого окна
function updateInfoWindow(window = infoWindow) {
    if (!window) {
        console.log('No window to update');
        return;
    }
    
    const info = getTradingInfo();

    window.innerHTML = `
        <div class="content">
            <div style="margin-bottom: 4px; color: #d1d4dc;">TradingView Optimizer</div>
            <div style="font-size: 11px; opacity: 0.8; color: #787b86;">
                <div>Symbol: ${info.symbol}</div>
                <div>Interval: ${info.interval}</div>
                <div>Settings: ${isStrategySettingsDetected ? '✅' : '❌'}</div>
                <div>Tracking: ${isTrackingMode ? '🔍' : '⏸️'}</div>
            </div>
            ${!isStrategySettingsDetected ? `
                <button class="tv-optimizer-button" id="trackButton" style="
                    background: #2962ff;
                    color: #fff;
                    border: none;
                    border-radius: 4px;
                    padding: 6px 12px;
                    margin-top: 8px;
                    cursor: pointer;
                    font-size: 12px;
                ">
                    ${isTrackingMode ? 'Cancel Tracking' : 'Detect Settings Button'}
                </button>
            ` : `
                <div style="display: flex; gap: 4px; align-items: center; margin-top: 8px;">
                    <button class="tv-optimizer-button" id="openSettingsButton" style="
                        background: #2962ff;
                        color: #fff;
                        border: none;
                        border-radius: 4px;
                        padding: 6px 12px;
                        cursor: pointer;
                        font-size: 12px;
                    ">
                        Open Strategy Settings
                    </button>
                    <button class="tv-optimizer-button" id="resetButton" style="
                        padding: 4px 8px;
                        min-width: auto;
                        background: #364250;
                        color: #d1d4dc;
                        border: 1px solid #4c525e;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                    " title="Detect button again">
                        🔄
                    </button>
                </div>
            `}
            ${backtestResults.netProfit !== null ? `
                <div class="backtest-results" style="
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 1px solid #363c4e;
                ">
                    <div class="result-item" style="margin: 4px 0;">
                        <span class="label" style="color: #787b86;">Net Profit:</span>
                        <span class="value ${getValueClass(backtestResults.netProfit)}" style="
                            color: ${getValueClass(backtestResults.netProfit) === 'positive' ? '#089981' : 
                                   getValueClass(backtestResults.netProfit) === 'negative' ? '#f23645' : '#d1d4dc'}
                        ">
                            ${formatUSDT(backtestResults.netProfit)}
                            ${backtestResults.netProfitPercent ? `(${formatPercent(backtestResults.netProfitPercent)})` : ''}
                        </span>
                    </div>
                    <div class="result-item" style="margin: 4px 0;">
                        <span class="label" style="color: #787b86;">Total Closed Trades:</span>
                        <span class="value" style="color: #d1d4dc;">${backtestResults.totalTrades || '—'}</span>
                    </div>
                    <div class="result-item" style="margin: 4px 0;">
                        <span class="label" style="color: #787b86;">Percent Profitable:</span>
                        <span class="value" style="color: #d1d4dc;">${formatPercent(backtestResults.percentProfitable)}</span>
                    </div>
                    <div class="result-item" style="margin: 4px 0;">
                        <span class="label" style="color: #787b86;">Profit Factor:</span>
                        <span class="value ${getValueClass(backtestResults.profitFactor - 1)}" style="
                            color: ${getValueClass(backtestResults.profitFactor - 1) === 'positive' ? '#089981' : 
                                   getValueClass(backtestResults.profitFactor - 1) === 'negative' ? '#f23645' : '#d1d4dc'}
                        ">${formatNumber(backtestResults.profitFactor)}</span>
                    </div>
                    <div class="result-item" style="margin: 4px 0;">
                        <span class="label" style="color: #787b86;">Max Drawdown:</span>
                        <span class="value ${getValueClass(-backtestResults.maxDrawdown)}" style="
                            color: ${getValueClass(-backtestResults.maxDrawdown) === 'positive' ? '#089981' : 
                                   getValueClass(-backtestResults.maxDrawdown) === 'negative' ? '#f23645' : '#d1d4dc'}
                        ">
                            ${formatUSDT(backtestResults.maxDrawdown)}
                            ${backtestResults.maxDrawdownPercent ? `(${formatPercent(backtestResults.maxDrawdownPercent)})` : ''}
                        </span>
                    </div>
                    <div class="result-item" style="margin: 4px 0;">
                        <span class="label" style="color: #787b86;">Avg Trade:</span>
                        <span class="value ${getValueClass(backtestResults.avgTrade)}" style="
                            color: ${getValueClass(backtestResults.avgTrade) === 'positive' ? '#089981' : 
                                   getValueClass(backtestResults.avgTrade) === 'negative' ? '#f23645' : '#d1d4dc'}
                        ">
                            ${formatUSDT(backtestResults.avgTrade)}
                            ${backtestResults.avgTradePercent ? `(${formatPercent(backtestResults.avgTradePercent)})` : ''}
                        </span>
                    </div>
                    <div class="result-item" style="margin: 4px 0;">
                        <span class="label" style="color: #787b86;">Avg # Bars in Trades:</span>
                        <span class="value" style="color: #d1d4dc;">${formatNumber(backtestResults.avgBarsInTrade, 0)}</span>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    // Добавляем обработчики для кнопок
    if (!isStrategySettingsDetected) {
        const trackButton = window.querySelector('#trackButton');
        if (trackButton) {
            trackButton.addEventListener('click', () => {
                toggleTrackingMode(!isTrackingMode);
            });
        }
    } else {
        const openSettingsButton = window.querySelector('#openSettingsButton');
        if (openSettingsButton) {
            openSettingsButton.addEventListener('click', openStrategySettings);
        }
        
        const resetButton = window.querySelector('#resetButton');
        if (resetButton) {
            resetButton.addEventListener('click', resetSettings);
        }
    }

    // Делаем окно перетаскиваемым
    makeWindowDraggable(window);
}

// Функция для получения информации о торговле
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
    console.log('Parsing backtest results');
    
    // Проверяем наличие окна
    if (!infoWindow) {
        console.log('Creating missing info window');
        createInfoWindow();
    }
    
    // Находим контейнер с результатами
    const reportContainer = document.querySelector('.reportContainer-xOy3zRsH');
    if (!reportContainer) {
        console.log('Report container not found');
        return null;
    }

    const container = reportContainer.querySelector('.container-Yvm0jjs7');
    if (!container) {
        console.log('Results container not found in report container');
        return null;
    }

    // Функция для извлечения значений по заголовку
    const getValuesByTitle = (title) => {
        const cell = Array.from(container.querySelectorAll('.containerCell-Yvm0jjs7'))
            .find(cell => cell.querySelector('.title-Yvm0jjs7')?.textContent === title);
            
        if (!cell) {
            console.log(`Cell with title "${title}" not found`);
            return { main: null, additional: null };
        }

        const secondRow = cell.querySelector('.secondRow-Yvm0jjs7');
        if (!secondRow) {
            console.log(`Second row not found for "${title}"`);
            return { main: null, additional: null };
        }

        // Получаем основное значение (первый div)
        const mainDiv = secondRow.querySelector('div:first-child');
        const mainValue = mainDiv?.textContent?.trim();
        
        // Получаем дополнительное процентное значение (второй div с классом additionalPercent)
        const additionalDiv = secondRow.querySelector('.additionalPercent-Yvm0jjs7');
        const additionalValue = additionalDiv?.textContent?.trim();

        console.log(`Found values for ${title}:`, { 
            main: mainValue, 
            mainClass: mainDiv?.className,
            additional: additionalValue,
            additionalClass: additionalDiv?.className
        });
        
        return { main: mainValue, additional: additionalValue };
    };

    // Функция для очистки и парсинга числового значения
    const parseValue = (value, removeUSDT = true) => {
        if (!value) return null;
        
        // Заменяем различные виды минусов на стандартный
        let cleaned = value.replace(/[\u2212\u2013\u2014−]/g, '-');
        
        if (removeUSDT) {
            cleaned = cleaned.replace(' USDT', '');
        }
        
        cleaned = cleaned.replace('%', '').replace(/,/g, '');
        const parsed = parseFloat(cleaned);
        
        console.log('Parsing value:', { 
            original: value, 
            afterMinusReplacement: cleaned,
            parsed: parsed,
            isNaN: isNaN(parsed)
        });
        
        return isNaN(parsed) ? null : parsed;
    };

    // Извлекаем все значения
    const netProfit = getValuesByTitle('Net Profit');
    const totalTrades = getValuesByTitle('Total Closed Trades');
    const percentProfitable = getValuesByTitle('Percent Profitable');
    const profitFactor = getValuesByTitle('Profit Factor');
    const maxDrawdown = getValuesByTitle('Max Drawdown');
    const avgTrade = getValuesByTitle('Avg Trade');
    const avgBarsInTrade = getValuesByTitle('Avg # Bars in Trades');

    // Преобразуем значения в числа
    const results = {
        netProfit: parseValue(netProfit.main),
        netProfitPercent: parseValue(netProfit.additional),
        totalTrades: parseInt(totalTrades.main) || null,
        percentProfitable: parseValue(percentProfitable.main),
        profitFactor: parseValue(profitFactor.main),
        maxDrawdown: parseValue(maxDrawdown.main),
        maxDrawdownPercent: parseValue(maxDrawdown.additional),
        avgTrade: parseValue(avgTrade.main),
        avgTradePercent: parseValue(avgTrade.additional),
        avgBarsInTrade: parseInt(avgBarsInTrade.main) || null
    };

    // Проверяем, что хотя бы одно значение не null
    const hasValidResults = Object.values(results).some(value => value !== null);
    
    if (hasValidResults) {
        console.log('Valid results found:', results);
        backtestResults = results;
        
        // Обновляем окно с новыми результатами
        if (infoWindow) {
            console.log('Updating existing info window');
            updateInfoWindow(infoWindow);
        } else {
            console.log('Info window lost, creating new one');
            createInfoWindow();
        }
    } else {
        console.log('No valid results found');
    }

    return hasValidResults ? results : null;
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
    showNotification('Кнопка не найдена. Включаю режим отслеживания 🔍');
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
        showNotification('Настройки сброшены ✨');
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

// Функция для включения/выключения режима отслеживания
function toggleTrackingMode(enable) {
    console.log('toggleTrackingMode:', enable);
    isTrackingMode = enable;
    
    if (enable) {
        // Добавляем обработчики на все этапы клика
        document.addEventListener('mousedown', detectStrategySettings, true);
        document.addEventListener('mouseup', detectStrategySettings, true);
        document.addEventListener('click', detectStrategySettings, true);
        showNotification('Нажмите кнопку настроек стратегии 🎯');
    } else {
        // Удаляем все обработчики
        document.removeEventListener('mousedown', detectStrategySettings, true);
        document.removeEventListener('mouseup', detectStrategySettings, true);
        document.removeEventListener('click', detectStrategySettings, true);
        showNotification('Отслеживание отменено ⏸️');
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
            showNotification('Кнопка настроек успешно определена! ✅');
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

// Функции управления окном
function showInfoWindow() {
    if (!infoWindow) {
        infoWindow = createInfoWindow();
    }
}

function hideInfoWindow() {
    if (infoWindow) {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
        infoWindow.remove();
        infoWindow = null;
    }
}

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_TRADING_INFO') {
        sendResponse(getTradingInfo());
    } else if (request.type === 'TOGGLE_INFO_WINDOW') {
        if (request.show) {
            showInfoWindow();
        } else {
            hideInfoWindow();
        }
    }
    return true;
});

// При инициализации проверяем наличие кнопки
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

// При инициализации восстанавливаем сохраненные данные
chrome.storage.local.get(['strategyButtonIndex', 'strategySettingsDetected', 'strategySettingsSelector'], (result) => {
    console.log('Loaded storage:', result);
    
    if (result.strategySettingsDetected) {
        isStrategySettingsDetected = true;
        strategySettingsSelector = result.strategySettingsSelector;
        strategyButtonIndex = result.strategyButtonIndex;
        console.log('Restored settings selector:', strategySettingsSelector, 'with index:', strategyButtonIndex);
    }
    
    // Создаем информационное окно
    createInfoWindow();
    
    // Запускаем наблюдение за результатами бэктеста
    observeBacktestResults();
});

// Функция инициализации
function init() {
    console.log('Initializing TradingView Optimizer...');
    
    chrome.storage.local.get(['strategyButtonIndex', 'strategySettingsDetected', 'strategySettingsSelector'], (result) => {
        console.log('Loaded storage:', result);
        
        if (result.strategySettingsDetected) {
            isStrategySettingsDetected = true;
            strategySettingsSelector = result.strategySettingsSelector;
            strategyButtonIndex = result.strategyButtonIndex;
            console.log('Restored settings selector:', strategySettingsSelector, 'with index:', strategyButtonIndex);
        }
        
        createInfoWindow();
        observeBacktestResults();
    });
}

// Запускаем инициализацию
init();

// Запускаем наблюдение при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting observers');
    setTimeout(observeBacktestResults, 2000);
});

// Функция для запуска наблюдения за результатами бэктеста
function observeBacktestResults() {
    console.log('Starting backtest results observer');
    
    // Функция для поиска контейнера с результатами
    const findResultsContainer = () => {
        // Сначала ищем reportContainer
        const reportContainer = document.querySelector('.reportContainer-xOy3zRsH');
        if (reportContainer) {
            console.log('Found report container');
            return reportContainer;
        }

        // Если не нашли reportContainer, ищем в bottom-area
        const bottomArea = document.querySelector('#bottom-area');
        if (!bottomArea) {
            console.log('Bottom area not found');
            return null;
        }

        // Ищем контейнер с результатами
        const container = bottomArea.querySelector('.container-Yvm0jjs7');
        if (!container) {
            console.log('Results container not found');
            return null;
        }

        console.log('Found results container in bottom area');
        return container;
    };

    // Функция обработки изменений
    const handleBacktestUpdate = (mutations) => {
        console.log('Processing backtest update, mutations:', mutations.length);
        
        // Проверяем, есть ли значимые изменения
        let hasRelevantChanges = false;
        for (const mutation of mutations) {
            // Проверяем добавление/удаление узлов
            if (mutation.type === 'childList') {
                hasRelevantChanges = true;
                console.log('Detected DOM structure change');
                break;
            }
            
            // Проверяем изменение текста
            if (mutation.type === 'characterData') {
                const parent = mutation.target.parentElement;
                if (parent && (
                    parent.classList.contains('secondRow-Yvm0jjs7') ||
                    parent.classList.contains('positiveValue-Yvm0jjs7') ||
                    parent.classList.contains('negativeValue-Yvm0jjs7')
                )) {
                    hasRelevantChanges = true;
                    console.log('Detected value change in:', parent);
                    break;
                }
            }
        }

        if (hasRelevantChanges) {
            console.log('Parsing updated results');
            const results = parseBacktestResults();
            if (results) {
                console.log('New results parsed:', results);
                updateInfoWindow();
            }
        }
    };

    // Создаем наблюдатель
    const observer = new MutationObserver((mutations) => {
        // Используем debounce, чтобы не обрабатывать слишком часто
        clearTimeout(observer.timeout);
        observer.timeout = setTimeout(() => {
            handleBacktestUpdate(mutations);
        }, 100); // Задержка 100мс
    });

    // Функция для начала наблюдения
    const startObserving = () => {
        const container = findResultsContainer();
        if (container) {
            console.log('Starting observation of container');
            observer.observe(container, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: false
            });
            // Сразу парсим текущие результаты
            handleBacktestUpdate([{ type: 'childList' }]);
        } else {
            console.log('Container not found, retrying in 1 second');
            setTimeout(startObserving, 1000);
        }
    };

    // Запускаем наблюдение
    startObserving();

    // Возвращаем функцию очистки
    return () => {
        console.log('Stopping backtest results observer');
        clearTimeout(observer.timeout);
        observer.disconnect();
    };
}
