// Функция обновления информации в popup
function updateInfo() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_TRADING_INFO' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError);
                return;
            }
            
            if (response) {
                document.getElementById('symbol').textContent = response.symbol;
                document.getElementById('interval').textContent = response.interval;
            }
        });
    });
}

// При загрузке popup
document.addEventListener('DOMContentLoaded', () => {
    const toggleSwitch = document.getElementById('showOnPage');
    
    // Загрузка состояния переключателя
    chrome.storage.local.get(['showInfoWindow'], (result) => {
        // Включено по умолчанию
        const showWindow = result.showInfoWindow !== undefined ? result.showInfoWindow : true;
        toggleSwitch.checked = showWindow;
        
        // Если окно должно быть показано по умолчанию, отправляем сообщение
        if (showWindow) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { 
                    type: 'TOGGLE_INFO_WINDOW',
                    show: true
                });
            });
        }
    });

    // Обработчик изменения переключателя
    toggleSwitch.addEventListener('change', () => {
        const showInfoWindow = toggleSwitch.checked;
        chrome.storage.local.set({ showInfoWindow });
        
        // Отправляем сообщение в content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { 
                type: 'TOGGLE_INFO_WINDOW',
                show: showInfoWindow
            });
        });
    });

    // Обновляем информацию при открытии
    updateInfo();
});
