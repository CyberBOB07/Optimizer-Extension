import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface OptimizationParams {
    minProfit: number;
    maxDrawdown: number;
    minTrades: number;
    minWinRate: number;
}

interface InputRange {
    min: number;
    max: number;
    step: number;
}

const Popup: React.FC = () => {
    const [params, setParams] = useState<OptimizationParams>({
        minProfit: 1000,
        maxDrawdown: 30,
        minTrades: 50,
        minWinRate: 50
    });

    const [ranges, setRanges] = useState<{ [key: string]: InputRange }>({});
    const [status, setStatus] = useState<string>('');
    const [results, setResults] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        // Получаем текущие результаты при открытии popup
        getCurrentResults();
    }, []);

    const getCurrentResults = async () => {
        try {
            setIsLoading(true);
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) return;

            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'getCurrentResults' 
            });

            if (response.error) {
                setStatus(`Ошибка: ${response.error}`);
                return;
            }

            setResults(response.data);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Откройте страницу TradingView со стратегией';
            setStatus(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const startOptimization = async () => {
        try {
            setIsLoading(true);
            setStatus('Начинаем оптимизацию...');
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) return;

            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'startOptimization',
                params,
                ranges
            });

            if (response.error) {
                setStatus(`Ошибка оптимизации: ${response.error}`);
                return;
            }

            setStatus('Оптимизация завершена!');
            setResults(response.result);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
            setStatus(`Ошибка: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const addRange = () => {
        const name = prompt('Введите название параметра:');
        if (!name) return;

        setRanges(prev => ({
            ...prev,
            [name]: { min: 0, max: 100, step: 1 }
        }));
    };

    const removeRange = (name: string) => {
        setRanges(prev => {
            const newRanges = { ...prev };
            delete newRanges[name];
            return newRanges;
        });
    };

    return (
        <div className="popup">
            <h2>TradingView Optimizer</h2>
            
            <div className="params">
                <h3>Критерии оптимизации</h3>
                <div>
                    <label>Мин. прибыль ($):</label>
                    <input
                        type="number"
                        value={params.minProfit}
                        onChange={e => setParams({...params, minProfit: Number(e.target.value)})}
                    />
                </div>
                <div>
                    <label>Макс. просадка (%):</label>
                    <input
                        type="number"
                        value={params.maxDrawdown}
                        onChange={e => setParams({...params, maxDrawdown: Number(e.target.value)})}
                    />
                </div>
                <div>
                    <label>Мин. кол-во сделок:</label>
                    <input
                        type="number"
                        value={params.minTrades}
                        onChange={e => setParams({...params, minTrades: Number(e.target.value)})}
                    />
                </div>
                <div>
                    <label>Мин. винрейт (%):</label>
                    <input
                        type="number"
                        value={params.minWinRate}
                        onChange={e => setParams({...params, minWinRate: Number(e.target.value)})}
                    />
                </div>
            </div>

            <div className="ranges">
                <div className="ranges-header">
                    <h3>Параметры для оптимизации</h3>
                    <button onClick={addRange} className="add-button">
                        Добавить
                    </button>
                </div>
                {Object.entries(ranges).map(([name, range]) => (
                    <div key={name} className="range-item">
                        <div className="range-header">
                            <span>{name}</span>
                            <button 
                                onClick={() => removeRange(name)}
                                className="remove-button"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="range-inputs">
                            <div>
                                <label>От:</label>
                                <input
                                    type="number"
                                    value={range.min}
                                    onChange={e => setRanges({
                                        ...ranges,
                                        [name]: {...range, min: Number(e.target.value)}
                                    })}
                                />
                            </div>
                            <div>
                                <label>До:</label>
                                <input
                                    type="number"
                                    value={range.max}
                                    onChange={e => setRanges({
                                        ...ranges,
                                        [name]: {...range, max: Number(e.target.value)}
                                    })}
                                />
                            </div>
                            <div>
                                <label>Шаг:</label>
                                <input
                                    type="number"
                                    value={range.step}
                                    onChange={e => setRanges({
                                        ...ranges,
                                        [name]: {...range, step: Number(e.target.value)}
                                    })}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button 
                onClick={startOptimization} 
                className="start-button"
                disabled={isLoading || Object.keys(ranges).length === 0}
            >
                {isLoading ? 'Оптимизация...' : 'Начать оптимизацию'}
            </button>

            {status && <div className="status">{status}</div>}

            {results && (
                <div className="results">
                    <h3>Результаты</h3>
                    <div className="metrics">
                        <div>
                            <label>Прибыль:</label>
                            <span>${results.results?.netProfit?.toFixed(2) || 0}</span>
                        </div>
                        <div>
                            <label>Просадка:</label>
                            <span>{results.results?.maxDrawdown?.toFixed(2) || 0}%</span>
                        </div>
                        <div>
                            <label>Сделок:</label>
                            <span>{results.results?.totalTrades || 0}</span>
                        </div>
                        <div>
                            <label>Винрейт:</label>
                            <span>{results.results?.percentProfitable?.toFixed(2) || 0}%</span>
                        </div>
                    </div>
                    {results.inputs && (
                        <div className="optimal-params">
                            <h4>Оптимальные параметры:</h4>
                            {Object.entries(results.inputs).map(([name, value]) => (
                                <div key={name}>
                                    <label>{name}:</label>
                                    <span>{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const root = document.getElementById('root');
if (root) {
    ReactDOM.render(<Popup />, root);
}
