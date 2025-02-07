// При загрузке popup
document.addEventListener('DOMContentLoaded', () => {
    const toggleSwitch = document.getElementById('showOnPage');
    
    // Загрузка состояния переключателя
    chrome.storage.local.get(['showInfoWindow'], (result) => {
        console.log('Loaded storage:', result);
        // Включено по умолчанию
        const showWindow = result.showInfoWindow !== undefined ? result.showInfoWindow : true;
        toggleSwitch.checked = showWindow;
    });

    // Обработчик изменения переключателя
    toggleSwitch.addEventListener('change', () => {
        const showInfoWindow = toggleSwitch.checked;
        console.log('Toggle switch changed:', showInfoWindow);
        
        // Отправляем сообщение в content script только на TradingView
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0].url.includes('tradingview.com')) {
                chrome.tabs.sendMessage(tabs[0].id, { 
                    type: 'TOGGLE_INFO_WINDOW',
                    show: showInfoWindow
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('Error:', chrome.runtime.lastError);
                        // В случае ошибки возвращаем переключатель в предыдущее состояние
                        toggleSwitch.checked = !showInfoWindow;
                    } else if (response && response.success) {
                        console.log('Window toggled successfully');
                        // Сохраняем состояние только после успешного переключения
                        chrome.storage.local.set({ showInfoWindow });
                    } else {
                        console.log('Failed to toggle window:', response);
                        // В случае ошибки возвращаем переключатель в предыдущее состояние
                        toggleSwitch.checked = !showInfoWindow;
                    }
                });
            }
        });
    });
});
