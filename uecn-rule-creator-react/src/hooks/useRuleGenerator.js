import { useState, useRef, useEffect } from 'react';

export const useRuleGenerator = (loadedFiles, showToast) => {
    const [ruleData, setRuleData] = useState({
        ruleName: '',
        problem: '',
        priority: 50,
        enabled: true,
        conditionMode: 'all',
        complexLogic: '',
        mainAction: 'fill',
        actionDetails: '',
        handleConflicts: '',
        handleErrors: 'skip',
        groupBy: '',
        duplicateKeys: '',
        duplicateStrategy: 'keep_first',
        requiresRules: '',
        blocksRules: '',
        validationFailAction: 'rollback'
    });

    const [dynamicItems, setDynamicItems] = useState({
        dataPreparation: [],
        conditions: [],
        validationChecks: [],
        mergeFields: []
    });

    const [generatedRule, setGeneratedRule] = useState('{}');
    const ruleCounter = useRef(1);

    // Инициализация - добавляем по одному элементу каждого типа
    useEffect(() => {
        setDynamicItems({
            dataPreparation: [{ id: Date.now() }],
            conditions: [{ id: Date.now() + 1 }],
            validationChecks: [{ id: Date.now() + 2 }],
            mergeFields: []
        });
    }, []);

    const updateRuleData = (field, value) => {
        setRuleData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const addDynamicItem = (type) => {
        setDynamicItems(prev => ({
            ...prev,
            [type]: [...prev[type], { id: Date.now() }]
        }));
    };

    const removeDynamicItem = (type, id) => {
        setDynamicItems(prev => ({
            ...prev,
            [type]: prev[type].filter(item => item.id !== id)
        }));
    };

    const updateDynamicItem = (type, id, field, value) => {
        setDynamicItems(prev => ({
            ...prev,
            [type]: prev[type].map(item => 
                item.id === id ? { ...item, [field]: value } : item
            )
        }));
    };

    const generateRule = () => {
        // Собираем информацию о загруженных файлах
        const dataSourcesInfo = {
            описание: "Информация об источниках данных для правила",
            файлы: {},
            алиасы_полей: {},
            общая_статистика: {
                загружено_файлов: Object.keys(loadedFiles).length,
                выбрано_листов: 0,
                доступно_полей: 0
            }
        };
        
        // Собираем детальную информацию по каждому файлу
        Object.values(loadedFiles).forEach(fileInfo => {
            const selectedSheets = Object.values(fileInfo.sheets).filter(sheet => sheet.selected);
            dataSourcesInfo.общая_статистика.выбрано_листов += selectedSheets.length;
            
            if (selectedSheets.length > 0) {
                dataSourcesInfo.файлы[fileInfo.name] = {
                    основной_алиас: fileInfo.alias,
                    многостраничный: fileInfo.hasMultipleSheets,
                    листы: {}
                };
                
                selectedSheets.forEach(sheetInfo => {
                    dataSourcesInfo.файлы[fileInfo.name].листы[sheetInfo.name] = {
                        алиас: sheetInfo.alias,
                        количество_полей: sheetInfo.fieldsCount,
                        поля: sheetInfo.fields
                    };
                    
                    dataSourcesInfo.общая_статистика.доступно_полей += sheetInfo.fieldsCount;
                    
                    // Создаем mapping алиасов полей
                    sheetInfo.fields.forEach(field => {
                        const fullReference = `${sheetInfo.alias}.${field}`;
                        dataSourcesInfo.алиасы_полей[fullReference] = {
                            исходный_файл: fileInfo.name,
                            лист: sheetInfo.name,
                            поле: field,
                            описание: sheetInfo.descriptions[field] || field
                        };
                    });
                });
            }
        });
        
        // Собираем данные подготовки
        const dataPreparation = dynamicItems.dataPreparation
            .map(item => item.action)
            .filter(action => action);
        
        // Собираем условия
        const conditions = dynamicItems.conditions
            .map(item => ({
                field: item.field,
                check: item.check,
                value: item.value,
                options: {}
            }))
            .filter(condition => condition.field);
        
        // Собираем проверки
        const validationChecks = dynamicItems.validationChecks
            .map(item => item.check)
            .filter(check => check);
        
        // Собираем стратегии объединения
        const mergeStrategies = {};
        dynamicItems.mergeFields.forEach(item => {
            if (item.field) {
                mergeStrategies[item.field] = item.strategy;
            }
        });
        
        const rule = {
            rule_id: `RULE${String(ruleCounter.current++).padStart(3, '0')}`,
            rule_name: ruleData.ruleName,
            problem: ruleData.problem,
            priority: parseInt(ruleData.priority),
            enabled: ruleData.enabled,
            created_at: new Date().toISOString(),
            
            data_sources: dataSourcesInfo,
            
            data_preparation: {
                описание: "Подготовка данных перед проверкой",
                действия: dataPreparation
            },
            
            when: {
                описание: "Условия применения правила",
                режим: ruleData.conditionMode === 'all' ? 'все условия' : 
                       ruleData.conditionMode === 'any' ? 'любое условие' : 
                       'сложная логика',
                conditions: conditions,
                group_by: ruleData.groupBy || null
            },
            
            what_to_do: {
                action: ruleData.mainAction,
                details: ruleData.actionDetails,
                handle_conflicts: ruleData.handleConflicts || null,
                handle_errors: ruleData.handleErrors
            },
            
            validation: {
                описание: "Проверка после применения",
                checks: validationChecks,
                on_fail: ruleData.validationFailAction
            },
            
            dependencies: {
                описание: "Связи с другими правилами",
                requires: ruleData.requiresRules.split(',').map(s => s.trim()).filter(s => s),
                blocks: ruleData.blocksRules.split(',').map(s => s.trim()).filter(s => s)
            }
        };
        
        // Добавляем обработку дубликатов если нужно
        if (ruleData.mainAction === 'merge_duplicates') {
            rule.duplicate_handling = {
                описание: "Обработка дубликатов",
                ключевые_поля: ruleData.duplicateKeys.split(',').map(s => s.trim()),
                стратегия: ruleData.duplicateStrategy,
                при_объединении: mergeStrategies
            };
        }
        
        // Добавляем сложную логику если указана
        if (ruleData.conditionMode === 'complex') {
            rule.when.complex_logic = ruleData.complexLogic;
        }
        
        const jsonString = JSON.stringify(rule, null, 2);
        setGeneratedRule(jsonString);
        showToast('Правило успешно создано!', 'success');
    };

    const loadExample = (exampleData) => {
        // Если передан объект с данными правила, используем его
        if (typeof exampleData === 'object' && exampleData !== null) {
            // Обновляем основные данные правила
            setRuleData(prev => ({
                ...prev,
                ruleName: exampleData.ruleName || '',
                problem: exampleData.problem || '',
                priority: exampleData.priority || 50,
                enabled: exampleData.enabled !== false,
                conditionMode: exampleData.conditionMode || 'all',
                complexLogic: exampleData.complexLogic || '',
                mainAction: exampleData.mainAction || 'fill',
                actionDetails: exampleData.actionDetails || '',
                handleConflicts: exampleData.handleConflicts || '',
                handleErrors: exampleData.handleErrors || 'skip',
                groupBy: exampleData.groupBy || '',
                duplicateKeys: exampleData.duplicateKeys || '',
                duplicateStrategy: exampleData.duplicateStrategy || 'keep_first',
                requiresRules: exampleData.requiresRules || '',
                blocksRules: exampleData.blocksRules || '',
                validationFailAction: exampleData.validationFailAction || 'rollback'
            }));
            
            // Обновляем динамические элементы
            const newDynamicItems = {
                dataPreparation: [],
                conditions: [],
                validationChecks: [],
                mergeFields: []
            };
            
            // Добавляем подготовку данных
            if (exampleData.dataPreparation && Array.isArray(exampleData.dataPreparation)) {
                newDynamicItems.dataPreparation = exampleData.dataPreparation.map((action, index) => ({
                    id: Date.now() + index,
                    action: typeof action === 'string' ? action : action.action
                }));
            } else {
                newDynamicItems.dataPreparation = [{ id: Date.now() }];
            }
            
            // Добавляем условия
            if (exampleData.conditions && Array.isArray(exampleData.conditions)) {
                newDynamicItems.conditions = exampleData.conditions.map((condition, index) => ({
                    id: Date.now() + 100 + index,
                    field: condition.field || '',
                    check: condition.check || 'empty',
                    value: condition.value || ''
                }));
            } else {
                newDynamicItems.conditions = [{ id: Date.now() + 100 }];
            }
            
            // Добавляем проверки
            if (exampleData.validationChecks && Array.isArray(exampleData.validationChecks)) {
                newDynamicItems.validationChecks = exampleData.validationChecks.map((check, index) => ({
                    id: Date.now() + 200 + index,
                    check: typeof check === 'string' ? check : check.check
                }));
            } else {
                newDynamicItems.validationChecks = [{ id: Date.now() + 200 }];
            }
            
            // Добавляем поля для объединения (если есть)
            if (exampleData.mergeFields && Array.isArray(exampleData.mergeFields)) {
                newDynamicItems.mergeFields = exampleData.mergeFields.map((field, index) => ({
                    id: Date.now() + 300 + index,
                    field: field.field || '',
                    strategy: field.strategy || 'first_not_empty'
                }));
            }
            
            setDynamicItems(newDynamicItems);
            showToast('Пример правила загружен!', 'success');
            return;
        }
        
        // Старая логика для обратной совместимости
        const examples = {
            'duplicates': {
                ruleName: 'Обработка противоречивых дубликатов УЭЦН',
                problem: 'Один ПЗД с разными датами и данными',
                priority: 10,
                mainAction: 'merge_duplicates',
                actionDetails: 'Объединить все записи с одинаковым ПЗД в одну, выбирая наиболее подходящие значения',
                duplicateKeys: 'Номер ПЗД',
                duplicateStrategy: 'merge'
            },
            'manufacturer': {
                ruleName: 'Умное заполнение завода-изготовителя',
                problem: 'Завод не указан или указан неправильно',
                priority: 20,
                mainAction: 'fill',
                actionDetails: 'Попробовать определить завод: 1) по первым буквам паспорта, 2) по модели, 3) по истории поставок'
            },
            'dates': {
                ruleName: 'Исправление последовательности дат',
                problem: 'Даты процессов в неправильном порядке',
                priority: 5,
                mainAction: 'calculate',
                actionDetails: 'Восстановить правильную последовательность дат с стандартными интервалами'
            },
            'normalization': {
                ruleName: 'Нормализация названий производителей',
                problem: 'Разные написания одного и того же производителя',
                priority: 15,
                mainAction: 'normalize',
                actionDetails: 'Привести все варианты написания к стандартному из справочника'
            },
            'multisheet': {
                ruleName: 'Сверка цен между листами прайса',
                problem: 'Цены на основном листе не соответствуют ценам со скидками',
                priority: 25,
                mainAction: 'fill',
                actionDetails: 'Если Прайс_Основной.Цена больше Прайс_Скидки.Цена_со_скидкой, взять цену со скидками',
                conditionMode: 'complex',
                complexLogic: 'Прайс_Основной.Цена > Прайс_Скидки.Цена_со_скидкой И Прайс_Основной.Артикул = Прайс_Скидки.Артикул'
            }
        };
        
        const example = examples[exampleData];
        if (example) {
            setRuleData(prev => ({
                ...prev,
                ...example
            }));
            
            showToast('Пример загружен!');
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedRule).then(() => {
            showToast('JSON скопирован в буфер обмена!', 'success');
        });
    };
    
    const downloadRule = () => {
        const blob = new Blob([generatedRule], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rule_${ruleData.ruleName || 'unnamed'}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Файл сохранен!', 'success');
    };
    
    const testRule = () => {
        showToast('Функция тестового запуска будет доступна после интеграции с системой', 'info');
    };
    
    const resetForm = () => {
        if (window.confirm('Вы уверены, что хотите очистить все поля?')) {
            setRuleData({
                ruleName: '',
                problem: '',
                priority: 50,
                enabled: true,
                conditionMode: 'all',
                complexLogic: '',
                mainAction: 'fill',
                actionDetails: '',
                handleConflicts: '',
                handleErrors: 'skip',
                groupBy: '',
                duplicateKeys: '',
                duplicateStrategy: 'keep_first',
                requiresRules: '',
                blocksRules: '',
                validationFailAction: 'rollback'
            });

            setDynamicItems({
                dataPreparation: [{ id: Date.now() }],
                conditions: [{ id: Date.now() + 1 }],
                validationChecks: [{ id: Date.now() + 2 }],
                mergeFields: []
            });

            setGeneratedRule('{}');
            
            showToast('Форма очищена!');
        }
    };

    return {
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
    };
}; 