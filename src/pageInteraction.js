// Взаимодействие со страницей TradingView
import { optimizationPanel } from './optimizationPanel';

console.log('TradingView Optimizer: pageInteraction.js загружен');

// Функция для определения типа параметра
function getParameterType(input) {
    if (input.type === 'checkbox') return 'boolean';
    if (input.type === 'number') return 'number';
    if (input.tagName.toLowerCase() === 'select') return 'select';
    return 'string';
}

// Функция для получения возможных значений select
function getSelectOptions(select) {
    const options = [];
    select.querySelectorAll('option').forEach(option => {
        options.push({
            value: option.value,
            text: option.textContent,
            isDefault: option.selected
        });
    });
    return options;
}

// Функция для отслеживания входа в настройки стратегии
function watchStrategySettings() {
    console.log('TradingView Optimizer: Начало отслеживания настроек стратегии');

    let isSettingsOpen = false;

    // Отслеживаем открытие окна настроек стратегии
    const observer = new MutationObserver((mutations) => {
        console.log('TradingView Optimizer: Обнаружены изменения в DOM');
        
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    console.log('TradingView Optimizer: Добавлен новый узел:', node.tagName, node.className);
                    
                    // Проверяем, является ли новый узел окном настроек
                    if (node.classList && node.classList.contains('tv-dialog__modal-wrap')) {
                        console.log('TradingView Optimizer: Найдено модальное окно');
                        
                        // Проверяем, что это окно настроек стратегии
                        const title = node.querySelector('.js-dialog__title');
                        console.log('TradingView Optimizer: Заголовок окна:', title?.textContent);
                        
                        if (title && title.textContent.includes('Настройки стратегии')) {
                            console.log('TradingView Optimizer: Обнаружено окно настроек стратегии');
                            isSettingsOpen = true;
                            const settings = analyzeStrategySettings(node);
                            // Показываем панель оптимизации
                            optimizationPanel.show(settings);
                        }
                    }
                });
            }

            // Отслеживаем закрытие окна
            if (mutation.removedNodes.length) {
                mutation.removedNodes.forEach((node) => {
                    if (node.classList && node.classList.contains('tv-dialog__modal-wrap') && isSettingsOpen) {
                        isSettingsOpen = false;
                        console.log('TradingView Optimizer: Окно настроек стратегии закрыто');
                    }
                });
            }
        });
    });

    // Функция анализа настроек стратегии
    function analyzeStrategySettings(settingsWindow) {
        console.log('TradingView Optimizer: Начало анализа настроек стратегии');
        
        const settings = {
            inputs: [],
            checkboxes: [],
            selects: []
        };

        // Анализируем все input элементы
        const inputs = settingsWindow.querySelectorAll('input');
        console.log('TradingView Optimizer: Найдено input элементов:', inputs.length);
        
        inputs.forEach(input => {
            console.log('TradingView Optimizer: Анализ input элемента:', input.type, input.name || input.id);
            
            const paramType = getParameterType(input);
            const param = {
                name: input.getAttribute('name') || input.id,
                label: input.closest('.input-container')?.querySelector('label')?.textContent || '',
                type: paramType,
                value: input.value,
                defaultValue: input.defaultValue
            };

            if (paramType === 'boolean') {
                param.checked = input.checked;
                param.defaultChecked = input.defaultChecked;
                settings.checkboxes.push(param);
            } else {
                if (input.type === 'number') {
                    param.min = input.min || parseFloat(input.value) / 2;
                    param.max = input.max || parseFloat(input.value) * 2;
                    param.step = input.step || 1;
                }
                settings.inputs.push(param);
            }
        });

        // Анализируем select элементы
        const selects = settingsWindow.querySelectorAll('select');
        console.log('TradingView Optimizer: Найдено select элементов:', selects.length);
        
        selects.forEach(select => {
            console.log('TradingView Optimizer: Анализ select элемента:', select.name || select.id);
            
            settings.selects.push({
                name: select.getAttribute('name') || select.id,
                label: select.closest('.input-container')?.querySelector('label')?.textContent || '',
                type: 'select',
                value: select.value,
                options: getSelectOptions(select)
            });
        });

        console.log('TradingView Optimizer: Результаты анализа настроек:', settings);
        return settings;
    }

    // Начинаем наблюдение за изменениями в DOM
    console.log('TradingView Optimizer: Начало наблюдения за DOM');
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    return observer;
}

// Экспортируем функции
export {
    watchStrategySettings
};
