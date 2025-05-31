import { useState, useEffect } from 'react';

const TransformationStep = ({ step, index }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
        <div className="transformation-step">
            <div 
                className="step-header"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span className="step-number">Шаг {step.шаг || index + 1}</span>
                <span className="step-action">{step.действие}</span>
                <span className={`step-toggle ${isExpanded ? 'expanded' : ''}`}>▶</span>
            </div>
            {isExpanded && (
                <div className="step-details">
                    <p className="step-description">{step.описание}</p>
                    {step.столбцы_до && (
                        <div className="columns-section">
                            <h5>Столбцы до:</h5>
                            <div className="columns-list">
                                {step.столбцы_до.map((col, i) => (
                                    <span key={i} className="column-tag">{col}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {step.новые_столбцы && (
                        <div className="columns-section">
                            <h5>Новые столбцы:</h5>
                            <div className="columns-list">
                                {step.новые_столбцы.map((col, i) => (
                                    <span key={i} className="column-tag new">{col}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {step.найденные_проблемы && (
                        <div className="problems-section">
                            <h5>Найденные проблемы:</h5>
                            <ul>
                                {step.найденные_проблемы.map((problem, i) => (
                                    <li key={i}>{problem}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {step.детали && (
                        <p className="step-additional-details">{step.детали}</p>
                    )}
                </div>
            )}
        </div>
    );
};

const FileTransformation = ({ fileName, data, onEdit, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const getComplexityColor = (complexity) => {
        if (complexity.includes('Низкая')) return 'green';
        if (complexity.includes('Средняя')) return 'yellow';
        if (complexity.includes('Высокая')) return 'red';
        return 'gray';
    };
    
    return (
        <div className="file-transformation">
            <div 
                className="file-header"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="file-main-info">
                    <span className="file-icon">📄</span>
                    <span className="file-name-historical">{fileName}</span>
                    <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
                </div>
                <div className="file-stats">
                    <span className="stat-badge">{data["📊_ИТОГОВАЯ_СТАТИСТИКА"]?.успешность_обработки || '✅'}</span>
                    <span className={`complexity-badge ${getComplexityColor(data["📊_ИТОГОВАЯ_СТАТИСТИКА"]?.сложность_трансформации || '')}`}>
                        {data["📊_ИТОГОВАЯ_СТАТИСТИКА"]?.сложность_трансформации || 'Неизвестно'}
                    </span>
                </div>
            </div>
            
            {isExpanded && (
                <div className="file-details">
                    <div className="transformation-info">
                        <div className="info-section">
                            <h4>📥 Исходные данные</h4>
                            <p>Файл: <strong>{data["📥_ИСХОДНЫЕ_ДАННЫЕ"]?.исходный_файл}</strong></p>
                            <p>Столбцов: <strong>{data["📥_ИСХОДНЫЕ_ДАННЫЕ"]?.количество_исходных_столбцов}</strong></p>
                        </div>
                        
                        <div className="info-section">
                            <h4>⚙️ Анализ изменений</h4>
                            <div className="changes-stats">
                                <span className="stat added">➕ Добавлено: {data["⚙️_АНАЛИЗ_ИЗМЕНЕНИЙ"]?.статистика_изменений?.добавлено || 0}</span>
                                <span className="stat removed">➖ Удалено: {data["⚙️_АНАЛИЗ_ИЗМЕНЕНИЙ"]?.статистика_изменений?.удалено || 0}</span>
                                <span className="stat kept">✓ Сохранено: {data["⚙️_АНАЛИЗ_ИЗМЕНЕНИЙ"]?.статистика_изменений?.сохранено || 0}</span>
                            </div>
                        </div>
                        
                        <div className="info-section">
                            <h4>📤 Результат</h4>
                            <p>Файл: <strong>{data["📤_РЕЗУЛЬТИРУЮЩИЕ_ДАННЫЕ"]?.результирующий_файл}</strong></p>
                            {data["📤_РЕЗУЛЬТИРУЮЩИЕ_ДАННЫЕ"]?.формулы_и_правила && data["📤_РЕЗУЛЬТИРУЮЩИЕ_ДАННЫЕ"].формулы_и_правила.length > 0 && (
                                <div className="formulas-list">
                                    <h5>Применённые правила:</h5>
                                    {data["📤_РЕЗУЛЬТИРУЮЩИЕ_ДАННЫЕ"].формулы_и_правила.map((formula, i) => (
                                        <span key={i} className="formula-tag">{formula}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {data["🔄_ПОШАГОВАЯ_ТРАНСФОРМАЦИЯ"] && (
                        <div className="transformation-steps">
                            <h4>🔄 Пошаговая трансформация</h4>
                            {data["🔄_ПОШАГОВАЯ_ТРАНСФОРМАЦИЯ"].map((step, index) => (
                                <TransformationStep key={index} step={step} index={index} />
                            ))}
                        </div>
                    )}
                    
                    <div className="file-actions-historical">
                        <button className="btn btn-secondary" onClick={() => onEdit(fileName, data)}>
                            ✏️ Редактировать
                        </button>
                        <button className="btn btn-danger" onClick={() => onDelete(fileName)}>
                            🗑️ Удалить
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const HistoricalWork = ({ historicalData, onUpdate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterComplexity, setFilterComplexity] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    
    const files = historicalData?.файлы || {};
    
    const filteredFiles = Object.entries(files).filter(([fileName, data]) => {
        const matchesSearch = fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            data["📥_ИСХОДНЫЕ_ДАННЫЕ"]?.исходный_файл?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesComplexity = filterComplexity === 'all' || 
                                 (data["📊_ИТОГОВАЯ_СТАТИСТИКА"]?.сложность_трансформации || '').includes(filterComplexity);
        
        return matchesSearch && matchesComplexity;
    });
    
    const sortedFiles = filteredFiles.sort(([aName, aData], [bName, bData]) => {
        if (sortBy === 'name') return aName.localeCompare(bName);
        if (sortBy === 'complexity') {
            const aComplexity = aData["📊_ИТОГОВАЯ_СТАТИСТИКА"]?.сложность_трансформации || '';
            const bComplexity = bData["📊_ИТОГОВАЯ_СТАТИСТИКА"]?.сложность_трансформации || '';
            return aComplexity.localeCompare(bComplexity);
        }
        return 0;
    });
    
    const handleEdit = (fileName, data) => {
        // Здесь можно открыть модальное окно для редактирования
        console.log('Editing:', fileName, data);
        // TODO: Implement edit functionality
    };
    
    const handleDelete = (fileName) => {
        if (window.confirm(`Удалить запись о файле "${fileName}"?`)) {
            const newData = { ...historicalData };
            delete newData.файлы[fileName];
            onUpdate(newData);
        }
    };
    
    return (
        <div className="historical-work">
            <div className="historical-header">
                <div className="stats-overview">
                    <span className="stat-item">
                        📊 Всего файлов: <strong>{historicalData?.статистика?.всего_готовых_файлов || 0}</strong>
                    </span>
                    <span className="stat-item">
                        📥 Исходных: <strong>{historicalData?.статистика?.всего_исходных_файлов || 0}</strong>
                    </span>
                    <span className="stat-item">
                        ✅ Покрытие: <strong>{historicalData?.статистика?.покрытие_анализа || '0%'}</strong>
                    </span>
                </div>
            </div>
            
            <div className="historical-controls">
                <input
                    type="text"
                    placeholder="🔍 Поиск по названию..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                
                <select 
                    value={filterComplexity}
                    onChange={(e) => setFilterComplexity(e.target.value)}
                    className="filter-select"
                >
                    <option value="all">Все сложности</option>
                    <option value="Низкая">🟢 Низкая</option>
                    <option value="Средняя">🟡 Средняя</option>
                    <option value="Высокая">🔴 Высокая</option>
                </select>
                
                <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="sort-select"
                >
                    <option value="name">Сортировка: По имени</option>
                    <option value="complexity">Сортировка: По сложности</option>
                </select>
            </div>
            
            <div className="files-list-historical">
                {sortedFiles.length === 0 ? (
                    <p className="no-files">Нет файлов для отображения</p>
                ) : (
                    sortedFiles.map(([fileName, data]) => (
                        <FileTransformation
                            key={fileName}
                            fileName={fileName}
                            data={data}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default HistoricalWork; 