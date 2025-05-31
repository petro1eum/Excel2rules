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
            dataPreparation: [{ id: `dp_${Date.now()}` }],
            conditions: [{ id: `cond_${Date.now() + 1}` }],
            validationChecks: [{ id: `val_${Date.now() + 2}` }],
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
        const newId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`Adding new ${type} item with ID: ${newId}`);
        setDynamicItems(prev => ({
            ...prev,
            [type]: [...prev[type], { id: newId }]
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
        
        // Собираем данные подготовки в структурированном виде
        const dataPreparation = {
            описание: "Подготовка данных перед проверкой",
            действия: dynamicItems.dataPreparation
                .filter(item => item.action)
                .map(item => {
                    // Пытаемся парсить структурированные действия
                    const action = item.action;
                    
                    // Проверяем типовые паттерны действий
                    if (action.includes('формат') && action.includes('дат')) {
                        const fieldMatch = action.match(/поле[:\s]*['"]?([^'"]+)['"]?/i);
                        const formatMatch = action.match(/формат[:\s]*['"]?([^'"]+)['"]?/i) || 
                                          action.match(/YYYY-MM-DD(?:\s+HH:mm:ss)?/);
                        return {
                            type: "format_date",
                            field: fieldMatch ? fieldMatch[1] : "all_date_fields",
                            format: formatMatch ? formatMatch[1]?.replace(/^[уык]\s+/, '') || formatMatch[0] : "YYYY-MM-DD HH:mm:ss",
                            description: action
                        };
                    }
                    
                    if (action.includes('заменить') || action.includes('NULL')) {
                        const fieldMatch = action.match(/поле[:\s]*['"]?([^'"]+)['"]?/i);
                        return {
                            type: "replace_null",
                            field: fieldMatch ? fieldMatch[1] : "all_fields",
                            replace_with: "",
                            description: action
                        };
                    }
                    
                    // Для других действий возвращаем как есть
                    return {
                        type: "custom",
                        description: action
                    };
                })
        };
        
        // Собираем условия в исполняемом формате
        const conditions = dynamicItems.conditions
            .filter(item => item.field)
            .map(item => ({
                field: item.field,
                operator: item.check,
                value: item.value || "",
                // Определяем тип значения только для операторов, где это важно
                value_type: item.check === 'not_empty' || item.check === 'empty' ? undefined :
                           item.value && item.value.includes('.') ? "field_reference" : 
                           item.value && !isNaN(item.value) ? "number" : "string"
            }));
        
        // Парсим формулы из actionDetails
        const formulas = {};
        let hasConditionalLogic = false;
        if (ruleData.actionDetails) {
            // Ищем паттерны формул вида "поле = выражение" или "поле: выражение"
            const formulaMatches = ruleData.actionDetails.match(/['"]?(\w+)['"]?\s*[:=]\s*([^,\n]+)/g);
            if (formulaMatches) {
                formulaMatches.forEach(match => {
                    const parts = match.split(/[:=]/);
                    if (parts.length < 2) return;
                    
                    const field = parts[0].trim().replace(/['"]/g, '');
                    const formula = parts.slice(1).join('=').trim().replace(/['"]/g, '');
                    
                    // Игнорируем пустые или неполные формулы
                    if (!field || !formula || formula.length < 3) return;
                    
                    // Проверяем, является ли это проблемным названием поля
                    if (field.includes('=') || field.includes('?')) {
                        // Пропускаем проблемные названия полей
                        return;
                    }
                    
                    // Преобразуем текстовые формулы в исполняемые
                    let executableFormula = formula;
                    
                    // Замена текстовых операций на SQL/Excel синтаксис
                    executableFormula = executableFormula
                        .replace(/\s*\+\s*1\s*час/gi, ' + INTERVAL 1 HOUR')
                        .replace(/больше\s+(\d+)\s+дн/gi, '> $1')
                        .replace(/если\s+/gi, 'IF(')
                        .replace(/\s+то\s+/gi, ', ')
                        .replace(/\s+иначе\s+/gi, ', ')
                        .replace(/разница между/gi, 'DATEDIFF(')
                        .replace(/\sи\s/gi, ', ');
                    
                    formulas[field] = executableFormula;
                });
            }
            
            // Проверяем наличие условной логики (IF/THEN/ELSE)
            const conditionalPatterns = [
                /IF\s*\(/i,
                /CASE\s+WHEN/i,
                /Если\s+\d+\s+то/i,
                /ЕСЛИ.*ТО.*ИНАЧЕ/i,
                /условие\s*=\s*\d+/i
            ];
            
            hasConditionalLogic = conditionalPatterns.some(pattern => pattern.test(ruleData.actionDetails));
        }
        
        // Собираем проверки в структурированном виде
        const validationChecks = dynamicItems.validationChecks
            .filter(item => item.check)
            .map(item => {
                const check = item.check;
                
                // Парсим типовые проверки
                if (check.includes('должна быть заполнена') || check.includes('должно быть заполнено')) {
                    const fieldMatch = check.match(/['"]?(\w+)['"]?/);
                    return {
                        type: "not_null",
                        field: fieldMatch ? fieldMatch[1] : null,
                        message: check
                    };
                }
                
                if (check.includes('не должна превышать') || check.includes('не больше')) {
                    const fieldMatch = check.match(/между\s+['"]?(\w+)['"]?\s+и\s+['"]?(\w+)['"]?/i);
                    const valueMatch = check.match(/(\d+)\s*дн/);
                    
                    if (fieldMatch || valueMatch) {
                        return {
                            type: "max_difference",
                            field1: fieldMatch ? fieldMatch[1] : "Дата_прихода_на_базу",
                            field2: fieldMatch ? fieldMatch[2] : "Дата_приходной_накладной",
                            max_value: valueMatch ? parseInt(valueMatch[1]) : 7,
                            unit: "days",
                            message: check
                        };
                    }
                }
                
                return {
                    type: "custom",
                    check: check
                };
            });
        
        const rule = {
            rule_id: `RULE${String(ruleCounter.current++).padStart(3, '0')}`,
            rule_name: ruleData.ruleName,
            problem: ruleData.problem,
            priority: parseInt(ruleData.priority),
            enabled: ruleData.enabled,
            created_at: new Date().toISOString(),
            
            data_sources: dataSourcesInfo,
            
            data_preparation: dataPreparation,
            
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
                // Добавляем formulas только если они не пустые
                ...(Object.keys(formulas).length > 0 && { formulas }),
                // Добавляем logic только если есть реальная условная логика
                ...(hasConditionalLogic && { 
                    logic: { 
                        условная_логика: ruleData.actionDetails 
                    } 
                }),
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
                при_объединении: dynamicItems.mergeFields
                    .filter(item => item.field)
                    .reduce((acc, item) => {
                        acc[item.field] = item.strategy;
                        return acc;
                    }, {})
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
                dataPreparation: [{ id: `dp_${Date.now()}` }],
                conditions: [{ id: `cond_${Date.now() + 1}` }],
                validationChecks: [{ id: `val_${Date.now() + 2}` }],
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