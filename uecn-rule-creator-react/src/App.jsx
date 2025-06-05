import { useState, useEffect } from 'react';
import './styles/App.css';
import { useToast } from './hooks/useToast';
import { useFileManager } from './hooks/useFileManager';
import { useDragDrop } from './hooks/useDragDrop';
import { useRuleGenerator } from './hooks/useRuleGenerator';
import FileUploader from './components/FileUploader';
import ExamplesPanel from './components/ExamplesPanel';
import FieldsPanel from './components/FieldsPanel';

import Toast from './components/Toast';

function App() {
    const [isFieldsPanelOpen, setIsFieldsPanelOpen] = useState(false);
    const [isSimpleMode, setIsSimpleMode] = useState(false);

    const { toast, showToast, hideToast } = useToast();
    
    const {
        loadedFiles,
        availableFields,
        fieldDescriptions,
        handleMultipleFiles,
        updateGlobalFields,
        toggleSheet,
        selectAllSheets,
        selectNoSheets,
        updateSheetAlias,
        updateFileAlias,
        removeFile,
        showFileDebugInfo
    } = useFileManager(showToast);

    const {
        handleFieldDragStart,
        handleFieldDragEnd,
        setupAllDropZones,
        setupDragHelper,
        insertField
    } = useDragDrop(showToast);

    const {
        ruleData,
        dynamicItems,
        generatedRule,
        updateRuleData,
        addDynamicItem,
        removeDynamicItem,
        updateDynamicItem,
        generateRule,
        loadExample,
        copyToClipboard,
        downloadRule,
        testRule,
        resetForm
    } = useRuleGenerator(loadedFiles, showToast);

    // Инициализация при монтировании
    useEffect(() => {
        // Инициализация режима эффектов
        const simpleMode = localStorage.getItem('simpleMode') === 'true';
        setIsSimpleMode(simpleMode);
        if (simpleMode) {
            document.body.classList.add('simple-mode');
        }

        // Настройка drag & drop
        const cleanupDropZones = setupAllDropZones();
        const cleanupDragHelper = setupDragHelper();

        return () => {
            cleanupDropZones();
            cleanupDragHelper();
        };
    }, [setupAllDropZones, setupDragHelper]);

    // Обновление глобальных полей при изменении файлов
    useEffect(() => {
        updateGlobalFields();
    }, [loadedFiles]);

    const toggleVisualEffects = () => {
        const newSimpleMode = !isSimpleMode;
        setIsSimpleMode(newSimpleMode);
        
        if (newSimpleMode) {
            document.body.classList.add('simple-mode');
            localStorage.setItem('simpleMode', 'true');
            showToast('Визуальные эффекты отключены');
        } else {
            document.body.classList.remove('simple-mode');
            localStorage.setItem('simpleMode', 'false');
            showToast('Визуальные эффекты включены', 'success');
        }
    };

    const toggleFieldsPanel = () => {
        setIsFieldsPanelOpen(!isFieldsPanelOpen);
    };

    const closeFieldsPanel = () => {
        setIsFieldsPanelOpen(false);
    };

    const updatePriorityValue = (value) => {
        updateRuleData('priority', value);
    };

    const updateActionDetails = (action) => {
        updateRuleData('mainAction', action);
        
        // Подсказки для разных действий
        const hints = {
            'fill': 'Откуда взять значение? Например: из поля "Модель" или из справочника',
            'replace': 'На что заменить? Например: заменить "н/д" на "НЕИЗВЕСТНО"',
            'calculate': 'Как вычислить? Например: дата прихода + 7 дней',
            'normalize': 'В какой формат привести? Например: ДД.ММ.ГГГГ для дат',
            'merge_duplicates': 'Заполните настройки обработки дубликатов ниже',
            'mark_error': 'Какое сообщение показать? Например: "Требуется ручная проверка"',
            'delete': 'Подтвердите удаление записей, соответствующих условиям'
        };
        
        if (!ruleData.actionDetails) {
            updateRuleData('actionDetails', hints[action] || 'Опишите действие...');
        }
    };

    const showDuplicateHandling = ruleData.mainAction === 'merge_duplicates';
    const showComplexLogic = ruleData.conditionMode === 'complex';
    const showMergeFields = ruleData.duplicateStrategy === 'merge';

    return (
        <div className="container">
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1rem' 
            }}>
                <h1 style={{ margin: 0 }}>Конструктор правил исправления ошибок УЭЦН</h1>
                <button 
                    className="btn btn-secondary" 
                    onClick={toggleVisualEffects}
                    style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                >
                    {isSimpleMode ? '✨ Включить эффекты' : '🎨 Отключить эффекты'}
                </button>
            </div>
            <p className="subtitle">Создавайте правила простым языком - система сама преобразует их в код</p>
            
            {/* Загрузка Excel файлов */}
            <div className="file-upload-section">
                <FileUploader
                    loadedFiles={loadedFiles}
                    onFileUpload={handleMultipleFiles}
                    onUpdateFileAlias={updateFileAlias}
                    onRemoveFile={removeFile}
                    onShowDebugInfo={showFileDebugInfo}
                    onToggleSheet={toggleSheet}
                    onSelectAllSheets={selectAllSheets}
                    onSelectNoSheets={selectNoSheets}
                    onUpdateSheetAlias={updateSheetAlias}
                />
            </div>
            
            <div className="main-layout">
                <div className="form-section">
                    {/* Основная информация */}
                    <div className="card">
                        <h2 className="section-title">📝 Основная информация</h2>
                        
                        <div className="form-group">
                            <label>Название правила</label>
                            <input 
                                type="text" 
                                value={ruleData.ruleName}
                                onChange={(e) => updateRuleData('ruleName', e.target.value)}
                                placeholder="Например: Исправление дат сборки"
                            />
                            <p className="help-text">Дайте правилу понятное название, описывающее его суть</p>
                        </div>
                        
                        <div className="form-group">
                            <label>Какую проблему решаем?</label>
                            <textarea 
                                value={ruleData.problem}
                                onChange={(e) => updateRuleData('problem', e.target.value)}
                                placeholder="Опишите проблему простым языком..."
                            />
                            <p className="help-text">Например: "Дата сборки часто указана раньше даты прихода компонентов"</p>
                        </div>
                        
                        <div className="form-group">
                            <label>Приоритет выполнения <span className="label-hint">(от 1 до 100)</span></label>
                            <div className="priority-input">
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="100" 
                                    value={ruleData.priority}
                                    onChange={(e) => updatePriorityValue(e.target.value)}
                                />
                                <span className="priority-value">{ruleData.priority}</span>
                            </div>
                            <p className="help-text">1-30: критичные ошибки, 31-60: заполнение пропусков, 61-100: улучшение качества</p>
                        </div>
                        
                        <div className="form-group">
                            <label>Правило активно?</label>
                            <label className="toggle-switch">
                                <input 
                                    type="checkbox" 
                                    checked={ruleData.enabled}
                                    onChange={(e) => updateRuleData('enabled', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    
                    {/* Подготовка данных */}
                    <div className="card">
                        <h2 className="section-title">🔧 Подготовка данных</h2>
                        <p style={{ marginBottom: '15px', color: '#666' }}>Что нужно сделать с данными перед проверкой?</p>
                        
                        <div>
                            {dynamicItems.dataPreparation.map(item => (
                                <div key={item.id} className="action-item">
                                    <input 
                                        type="text" 
                                        value={item.action || ''}
                                        onChange={(e) => updateDynamicItem('dataPreparation', item.id, 'action', e.target.value)}
                                        placeholder="Например: убрать пробелы из номера ПЗД" 
                                        className="data-prep-action"
                                    />
                                    <button 
                                        className="remove-btn" 
                                        onClick={() => removeDynamicItem('dataPreparation', item.id)}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button 
                            className="btn btn-secondary" 
                            onClick={() => addDynamicItem('dataPreparation')}
                        >
                            + Добавить действие
                        </button>
                        
                        <div style={{ marginTop: '15px' }}>
                            <p style={{ fontSize: '0.9rem', color: '#777' }}>Примеры действий:</p>
                            <ul style={{ fontSize: '0.85rem', color: '#666', marginLeft: '20px', marginTop: '5px' }}>
                                <li>Убрать лишние пробелы из номера ПЗД</li>
                                <li>Привести названия к верхнему регистру</li>
                                <li>Исправить кодировку в поле "Комментарий"</li>
                                <li>Нормализовать формат дат</li>
                            </ul>
                        </div>
                    </div>
                    
                    {/* Условия применения */}
                    <div className="card">
                        <h2 className="section-title">❓ Когда применять правило</h2>
                        
                        <div className="form-group">
                            <label>Режим проверки условий</label>
                            <select 
                                value={ruleData.conditionMode}
                                onChange={(e) => updateRuleData('conditionMode', e.target.value)}
                            >
                                <option value="all">Все условия должны выполняться</option>
                                <option value="any">Любое из условий</option>
                                <option value="complex">Сложная логика (опишу текстом)</option>
                            </select>
                        </div>
                        
                        {showComplexLogic && (
                            <div className="form-group">
                                <label>Опишите логику проверки</label>
                                <textarea 
                                    value={ruleData.complexLogic}
                                    onChange={(e) => updateRuleData('complexLogic', e.target.value)}
                                    placeholder="Например: (условие1 И условие2) ИЛИ условие3"
                                />
                            </div>
                        )}
                        
                        <div className="condition-builder">
                            <p style={{ marginBottom: '10px', fontWeight: 500 }}>Условия:</p>
                            <div style={{
                                background: 'rgba(0, 255, 136, 0.1)',
                                border: '1px solid rgba(0, 255, 136, 0.3)',
                                borderRadius: '6px',
                                padding: '10px',
                                marginBottom: '15px',
                                fontSize: '0.85rem',
                                color: '#00ff88'
                            }}>
                                <strong>💡 Совет:</strong> Перетаскивайте поля мышкой прямо в поля формы или кликайте для вставки в активное поле
                            </div>
                            <div>
                                {dynamicItems.conditions.map(item => (
                                    <div key={item.id} className="condition-row">
                                        <input 
                                            type="text" 
                                            value={item.field || ''}
                                            onChange={(e) => updateDynamicItem('conditions', item.id, 'field', e.target.value)}
                                            placeholder="Поле (можно перетащить из панели)" 
                                            className="condition-field"
                                        />
                                        <select 
                                            value={item.check || 'empty'}
                                            onChange={(e) => updateDynamicItem('conditions', item.id, 'check', e.target.value)}
                                            className="condition-check"
                                        >
                                            <option value="empty">пустое</option>
                                            <option value="not_empty">не пустое</option>
                                            <option value="equals">равно</option>
                                            <option value="not_equals">не равно</option>
                                            <option value="contains">содержит текст</option>
                                            <option value="similar_to">похоже на</option>
                                            <option value="in_list">в списке</option>
                                            <option value="duplicate">дубликат</option>
                                            <option value="before">раньше чем</option>
                                            <option value="after">позже чем</option>
                                        </select>
                                        <input 
                                            type="text" 
                                            value={item.value || ''}
                                            onChange={(e) => updateDynamicItem('conditions', item.id, 'value', e.target.value)}
                                            placeholder="Значение (или поле)" 
                                            className="condition-value"
                                        />
                                        <button 
                                            className="remove-btn" 
                                            onClick={() => removeDynamicItem('conditions', item.id)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => addDynamicItem('conditions')}
                            >
                                + Добавить условие
                            </button>
                            
                            <div style={{ marginTop: '15px' }}>
                                <p style={{ fontSize: '0.9rem', color: '#777' }}>Примеры условий с несколькими файлами:</p>
                                <ul style={{ fontSize: '0.85rem', color: '#666', marginLeft: '20px', marginTop: '5px' }}>
                                    <li><strong>Данные.Модель</strong> соответствует каталогу → <strong>Каталог.Модель</strong></li>
                                    <li><strong>Данные.Завод</strong> пустое И <strong>Данные.Модель</strong> есть в <strong>Каталог.Модель</strong></li>
                                    <li><strong>Данные.Цена</strong> не равно <strong>Прайс.Цена</strong> где <strong>Прайс.Артикул = Данные.Артикул</strong></li>
                                    <li><strong>Данные.Статус</strong> есть в <strong>Справочники_Статусы.Код</strong></li>
                                    <li><strong>Прайс_Основной.Цена</strong> больше <strong>Прайс_Скидки.Цена_со_скидкой</strong> (многостраничный файл)</li>
                                    <li><strong>Каталог_2024.Модель</strong> не равно <strong>Каталог_2023.Модель</strong> (сравнение листов разных годов)</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Группировать проверку по полю <span className="label-hint">(необязательно)</span></label>
                            <input 
                                type="text" 
                                value={ruleData.groupBy}
                                onChange={(e) => updateRuleData('groupBy', e.target.value)}
                                placeholder="Например: Номер ПЗД (можно перетащить поле)"
                            />
                            <p className="help-text">Если нужно проверять условия отдельно для каждой группы записей</p>
                        </div>
                    </div>
                    
                    {/* Что делать */}
                    <div className="card">
                        <h2 className="section-title">⚡ Что делать</h2>
                        
                        <div className="form-group">
                            <label>Основное действие</label>
                            <select 
                                value={ruleData.mainAction}
                                onChange={(e) => updateActionDetails(e.target.value)}
                            >
                                <option value="fill">Заполнить пустые значения</option>
                                <option value="replace">Заменить значения</option>
                                <option value="calculate">Вычислить из других полей</option>
                                <option value="normalize">Нормализовать формат</option>
                                <option value="merge_duplicates">Объединить дубликаты</option>
                                <option value="mark_error">Пометить как ошибку</option>
                                <option value="delete">Удалить записи</option>
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label>Подробности <span className="label-hint">(опишите простым языком)</span></label>
                            <textarea 
                                value={ruleData.actionDetails}
                                onChange={(e) => updateRuleData('actionDetails', e.target.value)}
                                placeholder="Что именно нужно сделать... (можно использовать названия полей)"
                            />
                            <div className="form-hint">
                                💡 При создании новых полей используйте простые имена без спецсимволов (=, ?, /).<br/>
                                ✅ Хорошо: Паспорта_совпадают, Статус_проверки, Верная_дата_прихода<br/>
                                ❌ Плохо: Если_паспорт_ГЗ=паспорту_ПЭД, поле?проверки
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Что делать при конфликтах?</label>
                            <input 
                                type="text" 
                                value={ruleData.handleConflicts}
                                onChange={(e) => updateRuleData('handleConflicts', e.target.value)}
                                placeholder="Например: выбрать более позднюю дату (можно указать поля)"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Что делать при ошибках?</label>
                            <select 
                                value={ruleData.handleErrors}
                                onChange={(e) => updateRuleData('handleErrors', e.target.value)}
                            >
                                <option value="skip">Пропустить запись</option>
                                <option value="mark">Пометить для ручной проверки</option>
                                <option value="default">Использовать значение по умолчанию</option>
                                <option value="stop">Остановить выполнение</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Обработка дубликатов */}
                    {showDuplicateHandling && (
                        <div className="card">
                            <h2 className="section-title">👥 Обработка дубликатов</h2>
                            
                            <div className="form-group">
                                <label>По каким полям искать дубликаты?</label>
                                <input 
                                    type="text" 
                                    value={ruleData.duplicateKeys}
                                    onChange={(e) => updateRuleData('duplicateKeys', e.target.value)}
                                    placeholder="Файл.Поле1, Файл.Поле2, ... (можно перетащить из панели)"
                                />
                                <p className="help-text">Например: "Данные.Номер_ПЗД" или "Данные.Паспорт_ГЗ, Данные.Паспорт_ПЭД"</p>
                            </div>
                            
                            <div className="form-group">
                                <label>Стратегия обработки</label>
                                <select 
                                    value={ruleData.duplicateStrategy}
                                    onChange={(e) => updateRuleData('duplicateStrategy', e.target.value)}
                                >
                                    <option value="keep_first">Оставить первую запись</option>
                                    <option value="keep_last">Оставить последнюю запись</option>
                                    <option value="keep_most_complete">Оставить самую полную</option>
                                    <option value="merge">Объединить данные</option>
                                </select>
                            </div>
                            
                            {showMergeFields && (
                                <div>
                                    <p style={{ margin: '15px 0 10px', fontWeight: 500 }}>Как объединять поля:</p>
                                    <div>
                                        {dynamicItems.mergeFields.map(item => (
                                            <div key={item.id} className="duplicate-strategy">
                                                <input 
                                                    type="text" 
                                                    value={item.field || ''}
                                                    onChange={(e) => updateDynamicItem('mergeFields', item.id, 'field', e.target.value)}
                                                    placeholder="Название поля (можно перетащить)" 
                                                    className="merge-field-name"
                                                />
                                                <select 
                                                    value={item.strategy || 'min'}
                                                    onChange={(e) => updateDynamicItem('mergeFields', item.id, 'strategy', e.target.value)}
                                                    className="merge-strategy"
                                                >
                                                    <option value="min">взять минимальное</option>
                                                    <option value="max">взять максимальное</option>
                                                    <option value="first_not_empty">взять первое непустое</option>
                                                    <option value="last_not_empty">взять последнее непустое</option>
                                                    <option value="concatenate">объединить через запятую</option>
                                                    <option value="sum">сумма значений</option>
                                                    <option value="average">среднее значение</option>
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                    <button 
                                        className="btn btn-secondary" 
                                        onClick={() => addDynamicItem('mergeFields')}
                                    >
                                        + Добавить поле
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Проверка после применения */}
                    <div className="card">
                        <h2 className="section-title">✅ Проверка результата</h2>
                        
                        <div className="form-group">
                            <label>Что проверить после применения правила?</label>
                            <div>
                                {dynamicItems.validationChecks.map(item => (
                                    <div key={item.id} className="action-item">
                                        <input 
                                            type="text" 
                                            value={item.check || ''}
                                            onChange={(e) => updateDynamicItem('validationChecks', item.id, 'check', e.target.value)}
                                            placeholder="Например: Дата сборки должна быть позже даты прихода" 
                                            className="validation-check"
                                        />
                                        <button 
                                            className="remove-btn" 
                                            onClick={() => removeDynamicItem('validationChecks', item.id)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => addDynamicItem('validationChecks')}
                            >
                                + Добавить проверку
                            </button>
                        </div>
                        <div className="form-group">
                            <label>Если проверка не прошла:</label>
                            <select 
                                value={ruleData.validationFailAction}
                                onChange={(e) => updateRuleData('validationFailAction', e.target.value)}
                            >
                                <option value="rollback">Откатить изменения</option>
                                <option value="mark_error">Пометить ошибкой</option>
                                <option value="manual_review">Запросить ручную проверку</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Зависимости */}
                    <div className="card">
                        <h2 className="section-title">🔗 Связи с другими правилами</h2>
                        
                        <div className="form-group">
                            <label>Какие правила должны выполниться до этого? <span className="label-hint">(ID правил)</span></label>
                            <input 
                                type="text" 
                                value={ruleData.requiresRules}
                                onChange={(e) => updateRuleData('requiresRules', e.target.value)}
                                placeholder="RULE001, RULE002"
                            />
                            <p className="help-text">Это правило будет ждать завершения указанных правил</p>
                        </div>
                        
                        <div className="form-group">
                            <label>С какими правилами нельзя выполнять одновременно?</label>
                            <input 
                                type="text" 
                                value={ruleData.blocksRules}
                                onChange={(e) => updateRuleData('blocksRules', e.target.value)}
                                placeholder="RULE003, RULE004"
                            />
                            <p className="help-text">Эти правила не будут запускаться параллельно</p>
                        </div>
                    </div>
                </div>
                
                {/* Панель примеров */}
                <ExamplesPanel onLoadExample={loadExample} />
            </div>
            

            
            {/* Результат */}
            <div className="output-section">
                <div className="card">
                    <h2 className="section-title">📄 Сгенерированное правило</h2>
                    <pre className="json-output">{generatedRule}</pre>
                </div>
            </div>
            
            <div className="action-buttons">
                <button className="btn btn-primary" onClick={generateRule}>🚀 Создать правило</button>
                <button className="btn btn-secondary" onClick={copyToClipboard}>📋 Копировать JSON</button>
                <button className="btn btn-secondary" onClick={downloadRule}>💾 Сохранить файл</button>
                <button className="btn btn-success" onClick={testRule}>🧪 Тестовый запуск</button>
                <button className="btn btn-danger" onClick={resetForm}>🗑️ Очистить форму</button>
            </div>
            
            {/* Toast */}
            <Toast message={toast.message} type={toast.type} show={toast.show} onClose={hideToast} />
            
            {/* Кнопка для панели полей */}
            <button 
                className="toggle-fields-btn" 
                onClick={toggleFieldsPanel}
                title="Показать доступные поля"
            >
                📋
            </button>
            
            {/* Панель с полями */}
            <FieldsPanel
                isOpen={isFieldsPanelOpen}
                loadedFiles={loadedFiles}
                onClose={closeFieldsPanel}
                onFieldClick={insertField}
                onFieldDragStart={handleFieldDragStart}
                onFieldDragEnd={handleFieldDragEnd}
            />
        </div>
    );
}

export default App;
