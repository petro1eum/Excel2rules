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
                    
                    {step.исправленные_столбцы && (
                        <div className="columns-section">
                            <h5>Исправленные столбцы:</h5>
                            <div className="columns-list">
                                {step.исправленные_столбцы.map((col, i) => (
                                    <span key={i} className="column-tag corrected">{col}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {step.формулы && (
                        <div className="formulas-section">
                            <h5>📐 Применённые формулы:</h5>
                            {Object.entries(step.формулы).map(([column, formula], i) => (
                                <div key={i} className="formula-item">
                                    <span className="formula-column">{column}:</span>
                                    <code className="formula-code">{formula}</code>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {step.логика && (
                        <div className="logic-section">
                            <h5>🧠 Логика валидации:</h5>
                            {Object.entries(step.логика).map(([column, logic], i) => (
                                <div key={i} className="logic-item">
                                    <span className="logic-column">{column}:</span>
                                    <code className="logic-code">{logic}</code>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {step.столбцы_валидации && (
                        <div className="validation-section">
                            <h5>✔️ Столбцы валидации:</h5>
                            <div className="columns-list">
                                {step.столбцы_валидации.map((col, i) => (
                                    <span key={i} className="column-tag validation">{col}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {step.расчетные_столбцы && (
                        <div className="calculation-section">
                            <h5>🧮 Расчётные столбцы:</h5>
                            <div className="columns-list">
                                {step.расчетные_столбцы.map((col, i) => (
                                    <span key={i} className="column-tag calculation">{col}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {step.найденные_проблемы && (
                        <div className="problems-section">
                            <h5>⚠️ Найденные проблемы:</h5>
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

const FileTransformation = ({ fileName, data, onEdit, onDelete, onLoadRules }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isRulesExpanded, setIsRulesExpanded] = useState(false);
    
    const getComplexityColor = (complexity) => {
        if (complexity.includes('Низкая')) return 'green';
        if (complexity.includes('Средняя')) return 'yellow';
        if (complexity.includes('Высокая')) return 'red';
        return 'gray';
    };
    
    const transformationData = data && data['🔄_ПОШАГОВАЯ_ТРАНСФОРМАЦИЯ'] || [];
    const finalStats = data && data['📊_ИТОГОВАЯ_СТАТИСТИКА'] || {};
    const sourceData = data && data['📥_ИСХОДНЫЕ_ДАННЫЕ'] || {};
    const resultData = data && data['📤_РЕЗУЛЬТИРУЮЩИЕ_ДАННЫЕ'] || {};
    const changesAnalysis = data && data['⚙️_АНАЛИЗ_ИЗМЕНЕНИЙ'] || {};
    
    const formatFileName = (name) => {
        return name.length > 50 ? name.substring(0, 47) + '...' : name;
    };
    
    const formatComplexity = (complexity) => {
        if (complexity.includes('Низкая')) return 'Низкая';
        if (complexity.includes('Средняя')) return 'Средняя';
        if (complexity.includes('Высокая')) return 'Высокая';
        return complexity;
    };
    
    // Извлекаем все формулы и логику из всех шагов
    const extractAllRulesAndFormulas = () => {
        const rules = {
            формулы: {},
            логика: {},
            валидация: [],
            коррекции: {}
        };
        
        // Из результирующих данных
        if (resultData.формулы_и_правила) {
            resultData.формулы_и_правила.forEach(rule => {
                rules.валидация.push(rule);
            });
        }
        
        // Из шагов трансформации
        transformationData.forEach(step => {
            if (step.формулы) {
                Object.assign(rules.формулы, step.формулы);
            }
            if (step.логика) {
                Object.assign(rules.логика, step.логика);
            }
        });
        
        return rules;
    };
    
    const allRules = extractAllRulesAndFormulas();
    const hasRules = Object.keys(allRules.формулы).length > 0 || 
                    Object.keys(allRules.логика).length > 0 || 
                    allRules.валидация.length > 0;
    
    // Подсчитываем общее количество правил
    const totalRulesCount = allRules.валидация.length + 
                           Object.keys(allRules.формулы).length + 
                           Object.keys(allRules.логика).length;
    
    return (
        <div className="file-transformation">
            <div className="file-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="file-main-info">
                    <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
                    <span className="file-name-historical" title={fileName}>
                        {formatFileName(fileName)}
                    </span>
                    {hasRules && <span className="has-rules-badge" title="Есть правила">📐</span>}
                </div>
                <div className="file-stats">
                    <span 
                        className={`complexity-badge ${getComplexityColor(finalStats.сложность_трансформации || '')}`}
                    >
                        {formatComplexity(finalStats.сложность_трансформации || 'Неизвестно')}
                    </span>
                </div>
            </div>
            
            {isExpanded && (
                <div className="file-details">
                    <div className="transformation-info">
                        <div className="info-section">
                            <h4>📥 Исходные данные</h4>
                            <p>Файл: <strong>{sourceData.исходный_файл}</strong></p>
                            <p>Столбцов: <strong>{sourceData.количество_исходных_столбцов}</strong></p>
                            {sourceData.все_исходные_столбцы && (
                                <details className="columns-details">
                                    <summary>Показать исходные столбцы ({sourceData.все_исходные_столбцы.length})</summary>
                                    <div className="columns-list compact">
                                        {sourceData.все_исходные_столбцы.map((col, i) => (
                                            <span key={i} className="column-tag small">{col}</span>
                                        ))}
                                    </div>
                                </details>
                            )}
                        </div>
                        
                        <div className="info-section">
                            <h4>⚙️ Анализ изменений</h4>
                            <div className="changes-stats">
                                <span className="stat added">➕ Добавлено: {changesAnalysis.статистика_изменений?.добавлено || 0}</span>
                                <span className="stat removed">➖ Удалено: {changesAnalysis.статистика_изменений?.удалено || 0}</span>
                                <span className="stat kept">✓ Сохранено: {changesAnalysis.статистика_изменений?.сохранено || 0}</span>
                            </div>
                            {changesAnalysis.добавленные_столбцы && changesAnalysis.добавленные_столбцы.length > 0 && (
                                <details className="columns-details">
                                    <summary>Добавленные столбцы ({changesAnalysis.добавленные_столбцы.length})</summary>
                                    <div className="columns-list compact">
                                        {changesAnalysis.добавленные_столбцы.map((col, i) => (
                                            <span key={i} className="column-tag small added">{col}</span>
                                        ))}
                                    </div>
                                </details>
                            )}
                        </div>
                        
                        <div className="info-section">
                            <h4>📤 Результат</h4>
                            <p>Файл: <strong>{resultData.результирующий_файл}</strong></p>
                            {resultData.все_результирующие_столбцы && (
                                <p>Итого столбцов: <strong>{resultData.все_результирующие_столбцы.length}</strong></p>
                            )}
                        </div>
                        
                        {hasRules && (
                            <div className="info-section rules-section">
                                <h4 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsRulesExpanded(!isRulesExpanded);
                                    }}
                                    style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                >
                                    <span>📐 Правила и формулы ({totalRulesCount})</span>
                                    <span style={{ fontSize: '0.7rem', color: '#888' }}>
                                        {isRulesExpanded ? '▼' : '▶'}
                                    </span>
                                </h4>
                                
                                {isRulesExpanded && (
                                    <>
                                        {resultData.формулы_и_правила && resultData.формулы_и_правила.length > 0 && (
                                            <div className="rules-subsection">
                                                <h5>Применённые правила:</h5>
                                                <div className="formulas-tags-container">
                                                    {resultData.формулы_и_правила.map((formula, i) => (
                                                        <div key={i} className="formula-tag-wrapper">
                                                            <span className="formula-tag" title={formula}>{formula}</span>
                                                            <button 
                                                                className="copy-formula-btn" 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigator.clipboard.writeText(formula);
                                                                }}
                                                                title="Копировать формулу"
                                                            >
                                                                📋
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {Object.keys(allRules.формулы).length > 0 && (
                                            <div className="rules-subsection">
                                                <h5>Формулы коррекции:</h5>
                                                {Object.entries(allRules.формулы).map(([column, formula], i) => (
                                                    <div key={i} className="formula-detail">
                                                        <span className="formula-column">{column}:</span>
                                                        <code className="formula-code">{formula}</code>
                                                        <button 
                                                            className="copy-formula-btn" 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigator.clipboard.writeText(formula);
                                                            }}
                                                            title="Копировать формулу"
                                                        >
                                                            📋
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {Object.keys(allRules.логика).length > 0 && (
                                            <div className="rules-subsection">
                                                <h5>Логика валидации:</h5>
                                                {Object.entries(allRules.логика).map(([column, logic], i) => (
                                                    <div key={i} className="logic-detail">
                                                        <span className="logic-column">{column}:</span>
                                                        <code className="logic-code">{logic}</code>
                                                        <button 
                                                            className="copy-formula-btn" 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigator.clipboard.writeText(logic);
                                                            }}
                                                            title="Копировать логику"
                                                        >
                                                            📋
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        <button 
                                            className="btn btn-primary load-rules-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onLoadRules(fileName, allRules, data);
                                            }}
                                        >
                                            🚀 Загрузить правила
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {transformationData.length > 0 && (
                        <div className="transformation-steps">
                            <h4>🔄 Пошаговая трансформация</h4>
                            {transformationData.map((step, index) => (
                                <TransformationStep key={index} step={step} index={index} />
                            ))}
                        </div>
                    )}
                    
                    {finalStats.основные_достижения && finalStats.основные_достижения.length > 0 && (
                        <div className="achievements-section">
                            <h4>🏆 Основные достижения</h4>
                            <ul>
                                {finalStats.основные_достижения.map((achievement, i) => (
                                    <li key={i}>{achievement}</li>
                                ))}
                            </ul>
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

const HistoricalWork = ({ historicalData, onUpdate, onLoadRules }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterComplexity, setFilterComplexity] = useState('all');
    const [filterHasRules, setFilterHasRules] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    
    const files = historicalData?.файлы || {};
    
    const filteredFiles = Object.entries(files).filter(([fileName, data]) => {
        const matchesSearch = fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            data["📥_ИСХОДНЫЕ_ДАННЫЕ"]?.исходный_файл?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesComplexity = filterComplexity === 'all' || 
                                 (data["📊_ИТОГОВАЯ_СТАТИСТИКА"]?.сложность_трансформации || '').includes(filterComplexity);
        
        const hasRules = (data["📤_РЕЗУЛЬТИРУЮЩИЕ_ДАННЫЕ"]?.формулы_и_правила?.length > 0) ||
                        data["🔄_ПОШАГОВАЯ_ТРАНСФОРМАЦИЯ"]?.some(step => step.формулы || step.логика);
        
        const matchesRulesFilter = filterHasRules === 'all' || 
                                  (filterHasRules === 'with-rules' && hasRules) ||
                                  (filterHasRules === 'without-rules' && !hasRules);
        
        return matchesSearch && matchesComplexity && matchesRulesFilter;
    });
    
    const sortedFiles = filteredFiles.sort(([aName, aData], [bName, bData]) => {
        if (sortBy === 'name') return aName.localeCompare(bName);
        if (sortBy === 'complexity') {
            const aComplexity = aData["📊_ИТОГОВАЯ_СТАТИСТИКА"]?.сложность_трансформации || '';
            const bComplexity = bData["📊_ИТОГОВАЯ_СТАТИСТИКА"]?.сложность_трансформации || '';
            return aComplexity.localeCompare(bComplexity);
        }
        if (sortBy === 'changes') {
            const aChanges = aData["⚙️_АНАЛИЗ_ИЗМЕНЕНИЙ"]?.статистика_изменений?.добавлено || 0;
            const bChanges = bData["⚙️_АНАЛИЗ_ИЗМЕНЕНИЙ"]?.статистика_изменений?.добавлено || 0;
            return bChanges - aChanges;
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
    
    const handleLoadRules = (fileName, rules, fullData) => {
        console.log('Loading rules from:', fileName, rules);
        if (onLoadRules) {
            onLoadRules(fileName, rules, fullData);
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
                    value={filterHasRules}
                    onChange={(e) => setFilterHasRules(e.target.value)}
                    className="filter-select"
                >
                    <option value="all">Все файлы</option>
                    <option value="with-rules">📐 С правилами</option>
                    <option value="without-rules">Без правил</option>
                </select>
                
                <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="sort-select"
                >
                    <option value="name">Сортировка: По имени</option>
                    <option value="complexity">Сортировка: По сложности</option>
                    <option value="changes">Сортировка: По изменениям</option>
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
                            onLoadRules={handleLoadRules}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default HistoricalWork; 