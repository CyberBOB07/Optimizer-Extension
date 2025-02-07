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
let isStrategySettingsDetected = false;
let isTrackingMode = false;
let strategySettingsSelector = '';
let strategyButtonIndex = -1;
let updateInterval = null;

// Константы для селекторов
const DEFAULT_SETTINGS_BUTTON_SELECTOR = '#bottom-area .backtesting .strategyGroup-zf0MHBzY .fixedContent-zf0MHBzY button.lightButton-bYDQcOkp.ghost-PVWoXu5j.gray-PVWoXu5j';

// Функция создания информационного окна
function createInfoWindow() {
    const infoWindow = document.createElement('div');
    infoWindow.id = 'tv-optimizer-info';
    
    // Добавляем стили
    const style = document.createElement('style');
    style.textContent = `
        #tv-optimizer-info {
            position: fixed;
            top: 50px;
            right: 200px;
            background: #131722;
            color: #d1d4dc;
            padding: 10px;
            border-radius: 4px;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            user-select: none;
            cursor: move;
            border: 1px solid #363c4e;
            min-width: 200px;
        }
        .tv-optimizer-button {
            margin-top: 8px;
            padding: 6px 10px;
            background: #2962ff;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            width: 100%;
            font-size: 11px;
            transition: background 0.2s;
        }
        .tv-optimizer-button:hover {
            background: #1e4bd8;
        }
    `;
    document.head.appendChild(style);
    
    // Обновляем содержимое окна
    updateInfoWindow(infoWindow);
    
    // Добавляем окно на страницу
    document.body.appendChild(infoWindow);
    
    // Делаем окно перетаскиваемым
    makeWindowDraggable(infoWindow);
    
    // Восстанавливаем позицию и состояние
    chrome.storage.local.get(['windowPosition', 'strategySettingsDetected', 'strategySettingsSelector', 'strategyButtonIndex'], (result) => {
        if (result.windowPosition) {
            infoWindow.style.top = result.windowPosition.top;
            infoWindow.style.right = result.windowPosition.right;
        }
        if (result.strategySettingsDetected) {
            isStrategySettingsDetected = true;
            strategySettingsSelector = result.strategySettingsSelector;
            strategyButtonIndex = result.strategyButtonIndex;
            updateInfoWindow(infoWindow);
        }
    });
    
    // Запускаем автообновление
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    updateInterval = setInterval(() => {
        console.log('Auto-updating info window');
        updateInfoWindow(infoWindow);
    }, 2000);
    
    return infoWindow;
}

// Функция обновления содержимого окна
function updateInfoWindow(window = infoWindow) {
    console.log('updateInfoWindow called', {
        window: window,
        isStrategySettingsDetected: isStrategySettingsDetected,
        isTrackingMode: isTrackingMode,
        strategySettingsSelector: strategySettingsSelector,
        strategyButtonIndex: strategyButtonIndex
    });
    
    if (!window) {
        console.log('No window to update');
        return;
    }
    
    const info = getTradingInfo();
    window.innerHTML = `
        <div class="content">
            <div style="margin-bottom: 4px;">TradingView Optimizer</div>
            <div style="font-size: 11px; opacity: 0.8;">
                <div>Символ: ${info.symbol}</div>
                <div>Интервал: ${info.interval}</div>
                <div>Settings: ${isStrategySettingsDetected ? '✅' : '❌'}</div>
                <div>Tracking: ${isTrackingMode ? '🔍' : '⏸️'}</div>
            </div>
            ${!isStrategySettingsDetected ? `
                <button class="tv-optimizer-button" id="trackButton">
                    ${isTrackingMode ? 'Отмена отслеживания' : 'Определить кнопку настроек'}
                </button>
            ` : `
                <div style="display: flex; gap: 4px; align-items: center;">
                    <button class="tv-optimizer-button" id="openSettingsButton">
                        Открыть настройки стратегии
                    </button>
                    <button class="tv-optimizer-button" id="resetButton" style="padding: 4px 8px; min-width: auto;" title="Определить кнопку заново">
                        🔄
                    </button>
                </div>
            `}
        </div>
    `;
    
    console.log('Window HTML updated');
    
    // Добавляем обработчики для кнопок
    if (!isStrategySettingsDetected) {
        const trackButton = window.querySelector('#trackButton');
        if (trackButton) {
            console.log('Adding track button handler');
            trackButton.addEventListener('click', () => {
                toggleTrackingMode(!isTrackingMode);
            });
        }
    } else {
        const openSettingsButton = window.querySelector('#openSettingsButton');
        if (openSettingsButton) {
            console.log('Adding settings button handler');
            openSettingsButton.addEventListener('click', openStrategySettings);
        }
        
        // Добавляем обработчик для кнопки сброса
        const resetButton = window.querySelector('#resetButton');
        if (resetButton) {
            console.log('Adding reset button handler');
            resetButton.addEventListener('click', resetSettings);
        }
    }
    
    console.log('Window update complete');
}

// Структура для хранения результатов бэктеста
let backtestResults = {
    netProfit: null,
    totalTrades: null,
    percentProfitable: null,
    profitFactor: null,
    maxDrawdown: null,
    netProfitPercent: null,
    maxDrawdownPercent: null
};

// Функция для парсинга результатов бэктеста
function parseBacktestResults() {
    try {
        const cells = document.querySelectorAll('.containerCell-Yvm0jjs7');
        if (!cells || cells.length === 0) {
            console.log('Ячейки с результатами не найдены');
            return null;
        }

        cells.forEach(cell => {
            const titleElement = cell.querySelector('.title-Yvm0jjs7');
            const secondRow = cell.querySelector('.secondRow-Yvm0jjs7');
            
            if (!titleElement || !secondRow) return;
            
            const title = titleElement.textContent.trim();
            
            switch (title) {
                case 'Net Profit': {
                    const value = secondRow.querySelector('.positiveValue-Yvm0jjs7')?.textContent?.trim();
                    const percent = secondRow.querySelector('.additionalPercent-Yvm0jjs7')?.textContent?.trim();
                    backtestResults.netProfit = value;
                    backtestResults.netProfitPercent = percent;
                    break;
                }
                case 'Total Closed Trades': {
                    const value = secondRow.querySelector('div:first-child')?.textContent?.trim();
                    backtestResults.totalTrades = value;
                    break;
                }
                case 'Percent Profitable': {
                    const value = secondRow.querySelector('.positiveValue-Yvm0jjs7')?.textContent?.trim();
                    backtestResults.percentProfitable = value;
                    break;
                }
                case 'Profit Factor': {
                    const value = secondRow.querySelector('.positiveValue-Yvm0jjs7')?.textContent?.trim();
                    backtestResults.profitFactor = value;
                    break;
                }
                case 'Max Drawdown': {
                    const value = secondRow.querySelector('.negativeValue-Yvm0jjs7')?.textContent?.trim();
                    const percent = secondRow.querySelector('.additionalPercent-Yvm0jjs7')?.textContent?.trim();
                    backtestResults.maxDrawdown = value;
                    backtestResults.maxDrawdownPercent = percent;
                    break;
                }
            }
        });

        console.log('Результаты парсинга:', backtestResults);
        return backtestResults;
    } catch (error) {
        console.error('Ошибка при парсинге результатов:', error);
        return null;
    }
}

// Обновляем функцию updateInfoWindow, добавляя результаты бэктеста
const originalUpdateInfoWindow = updateInfoWindow;
updateInfoWindow = function(window = infoWindow) {
    // Сначала вызываем оригинальную функцию
    originalUpdateInfoWindow(window);
    
    // Если окно существует, добавляем результаты бэктеста
    if (window) {
        const content = window.querySelector('.content');
        if (content) {
            // Парсим результаты
            parseBacktestResults();
            
            // Добавляем результаты, если они есть
            if (backtestResults.netProfit) {
                const backtestDiv = document.createElement('div');
                backtestDiv.style.fontSize = '11px';
                backtestDiv.style.opacity = '0.8';
                backtestDiv.style.marginTop = '8px';
                backtestDiv.style.borderTop = '1px solid #363c4e';
                backtestDiv.style.paddingTop = '8px';
                
                const isPositive = !backtestResults.netProfit.includes('-');
                const profitColor = isPositive ? '#089981' : '#f23645';
                
                backtestDiv.innerHTML = `
                    <div style="margin-bottom: 4px; font-weight: bold;">Результаты бэктеста:</div>
                    <div style="color: ${profitColor}">Прибыль: ${backtestResults.netProfit} (${backtestResults.netProfitPercent})</div>
                    <div>Сделок: ${backtestResults.totalTrades}</div>
                    <div>Прибыльных: ${backtestResults.percentProfitable}</div>
                    <div>П/Ф: ${backtestResults.profitFactor}</div>
                    <div style="color: #f23645">Просадка: ${backtestResults.maxDrawdown} (${backtestResults.maxDrawdownPercent})</div>
                `;
                
                content.appendChild(backtestDiv);
            }
        }
    }
};

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
chrome.storage.local.get(['strategySettingsDetected', 'strategySettingsSelector', 'strategyButtonIndex'], (result) => {
    console.log('Loaded storage:', result);
    if (result.strategySettingsDetected) {
        isStrategySettingsDetected = true;
        strategySettingsSelector = result.strategySettingsSelector;
        strategyButtonIndex = result.strategyButtonIndex;
        console.log('Restored settings selector:', strategySettingsSelector, 'with index:', strategyButtonIndex);
    }
});

// Создаем MutationObserver для отслеживания изменений в результатах бэктеста
const backtestObserver = new MutationObserver(() => {
    if (infoWindow) {
        updateInfoWindow();
    }
});

// Функция для запуска наблюдения за результатами бэктеста
function observeBacktestResults() {
    const resultsContainer = document.querySelector('.backtesting-content');
    if (resultsContainer) {
        backtestObserver.observe(resultsContainer, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
}

// Запускаем наблюдение при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(observeBacktestResults, 2000);
});

// Периодически проверяем наличие контейнера с результатами
setInterval(() => {
    observeBacktestResults();
}, 5000);
