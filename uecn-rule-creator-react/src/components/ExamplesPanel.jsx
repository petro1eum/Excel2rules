import { useState, useEffect } from 'react';
import HistoricalWork from './HistoricalWork';

const ExampleCard = ({ title, description, onClick }) => (
    <div className="example-card" onClick={onClick}>
        <div className="example-title">{title}</div>
        <div className="example-description">{description}</div>
    </div>
);

const ExamplesPanel = ({ onLoadExample }) => {
    const [typicalRulesExpanded, setTypicalRulesExpanded] = useState(true);
    const [historicalWorkExpanded, setHistoricalWorkExpanded] = useState(false);
    const [historicalData, setHistoricalData] = useState(null);
    const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);

    // Загружаем исторические данные при первом раскрытии
    useEffect(() => {
        if (historicalWorkExpanded && !historicalData && !isLoadingHistorical) {
            loadHistoricalData();
        }
    }, [historicalWorkExpanded]);

    const loadHistoricalData = async () => {
        setIsLoadingHistorical(true);
        try {
            // Загружаем данные из файла
            const response = await fetch('/complete_transformation_summary.json');
            const data = await response.json();
            setHistoricalData(data);
        } catch (error) {
            console.error('Ошибка загрузки исторических данных:', error);
            // Если файл не найден, пробуем загрузить из localStorage
            const savedData = localStorage.getItem('historicalTransformations');
            if (savedData) {
                setHistoricalData(JSON.parse(savedData));
            }
        } finally {
            setIsLoadingHistorical(false);
        }
    };

    const handleHistoricalDataUpdate = (newData) => {
        setHistoricalData(newData);
        // Сохраняем в localStorage для персистентности
        localStorage.setItem('historicalTransformations', JSON.stringify(newData));
    };

    const handleLoadRules = (fileName, rules, fullData) => {
        console.log('Loading rules from:', fileName);
        console.log('Rules:', rules);
        console.log('Full data:', fullData);
        
        // Преобразуем правила из исторических данных в формат для формы
        const ruleData = {
            ruleName: `Правило из ${fileName}`,
            problem: fullData['🎯'] || 'Загружено из исторических данных',
            priority: 85,
            enabled: true,
            conditionMode: 'all',
            conditions: [],
            mainAction: 'calculate',
            actionDetails: '',
            dataPreparation: [],
            validationChecks: []
        };
        
        // Извлекаем информацию о проблеме
        const problemStep = fullData['🔄_ПОШАГОВАЯ_ТРАНСФОРМАЦИЯ']?.find(step => 
            step.действие === 'АНАЛИЗ ПРОБЛЕМ' || step.действие === 'ОПРЕДЕЛЕНИЕ ПРОБЛЕМЫ'
        );
        if (problemStep) {
            if (problemStep.найденные_проблемы) {
                ruleData.problem = Array.isArray(problemStep.найденные_проблемы) 
                    ? problemStep.найденные_проблемы.join('. ')
                    : problemStep.найденные_проблемы;
            } else if (problemStep.проблема) {
                ruleData.problem = problemStep.проблема;
            } else if (problemStep.описание) {
                ruleData.problem = problemStep.описание;
            }
        }
        
        // Анализируем изменения для определения условий
        const changesAnalysis = fullData['⚙️_АНАЛИЗ_ИЗМЕНЕНИЙ'];
        const sourceData = fullData['📥_ИСХОДНЫЕ_ДАННЫЕ'];
        const resultData = fullData['📤_РЕЗУЛЬТИРУЮЩИЕ_ДАННЫЕ'];
        
        // Извлекаем поля с датами для условий
        if (fileName.toLowerCase().includes('дата прихода') && fileName.toLowerCase().includes('приходки')) {
            // Это правило про даты
            ruleData.conditions.push({
                field: "Данные.Дата_прихода_на_базу",
                check: "not_equals",
                value: "Данные.Дата_приходной_накладной"
            });
            
            // Основное действие - синхронизация дат
            ruleData.mainAction = 'calculate';
            ruleData.actionDetails = "Верная_дата_прихода = Дата_приходной_накладной + 1 час";
            
            // Подготовка данных для дат
            ruleData.dataPreparation.push({ 
                action: "Привести все даты к формату YYYY-MM-DD HH:mm:ss" 
            });
            
            // Валидация
            ruleData.validationChecks.push({ 
                check: "Верная_дата_прихода должна быть заполнена для всех записей" 
            });
        }
        
        // Извлекаем формулы из результирующих данных
        const formulas = [];
        Object.values(resultData.листы_результирующего_файла || {}).forEach(sheet => {
            if (sheet.формулы && Array.isArray(sheet.формулы)) {
                formulas.push(...sheet.формулы);
            }
        });
        
        // Обрабатываем найденные формулы
        if (formulas.length > 0) {
            const formulaDescriptions = [];
            formulas.forEach(formula => {
                if (formula.includes('Если') || formula.includes('IF')) {
                    // Это условная формула
                    formulaDescriptions.push(formula);
                    
                    // Добавляем соответствующие условия
                    if (formula.includes('паспорта ГЗ') && formula.includes('паспорта ПЭД')) {
                        ruleData.conditions.push({
                            field: "Данные.Номер_паспорта_ГЗ",
                            check: "not_empty",
                            value: ""
                        });
                        ruleData.conditions.push({
                            field: "Данные.Номер_паспорта_ПЭД",
                            check: "not_empty",
                            value: ""
                        });
                        
                        // Добавляем в описание действий
                        formulaDescriptions.push("Паспорта_совпадают = IF(Номер_паспорта_ГЗ = Номер_паспорта_ПЭД, 'ДА', 'НЕТ')");
                    }
                }
            });
            
            if (formulaDescriptions.length > 0 && !ruleData.actionDetails) {
                ruleData.actionDetails = formulaDescriptions.join('\n');
            }
        }
        
        // Анализируем добавленные столбцы
        if (changesAnalysis?.добавленные_столбцы?.length > 0) {
            changesAnalysis.добавленные_столбцы.forEach(col => {
                if (col.toLowerCase().includes('верная') || col.toLowerCase().includes('новая')) {
                    ruleData.mainAction = 'calculate';
                    if (!ruleData.actionDetails.includes(col)) {
                        ruleData.actionDetails += `\nСоздать поле: ${col}`;
                    }
                }
            });
        }
        
        // Извлекаем условия из шагов трансформации
        const transformationSteps = fullData['🔄_ПОШАГОВАЯ_ТРАНСФОРМАЦИЯ'] || [];
        transformationSteps.forEach(step => {
            if (step.условия_применения) {
                // Парсим условия из текста
                const conditionText = step.условия_применения;
                if (conditionText.includes('не совпадает') || conditionText.includes('!=')) {
                    // Уже добавлено выше
                } else if (conditionText.includes('пустое') || conditionText.includes('NULL')) {
                    const fieldMatch = conditionText.match(/поле\s+['"]?([^'"]+)['"]?/i);
                    if (fieldMatch) {
                        ruleData.conditions.push({
                            field: `Данные.${fieldMatch[1]}`,
                            check: "empty",
                            value: ""
                        });
                    }
                }
            }
        });
        
        // Убираем дубликаты условий
        const uniqueConditions = [];
        const conditionKeys = new Set();
        ruleData.conditions.forEach(cond => {
            const key = `${cond.field}-${cond.check}-${cond.value}`;
            if (!conditionKeys.has(key)) {
                conditionKeys.add(key);
                uniqueConditions.push(cond);
            }
        });
        ruleData.conditions = uniqueConditions;
        
        // Если условий нет, добавляем базовое условие
        if (ruleData.conditions.length === 0) {
            ruleData.conditions.push({
                field: "Данные.ID",
                check: "not_empty",
                value: ""
            });
        }
        
        // Загружаем правило в форму
        onLoadExample(ruleData);
        
        // Показываем уведомление
        const toast = document.createElement('div');
        toast.className = 'toast show success';
        toast.textContent = `✅ Правила из "${fileName}" загружены в форму`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    const examples = [
        {
            title: "Несоответствие дат прихода и приходки",
            description: "Самая частая проблема - даты не синхронизированы",
            data: {
                ruleName: "Синхронизация дат прихода с накладными",
                problem: "Дата прихода на базу не совпадает с датой приходной накладной для всех типов оборудования (ГЗ, насосы, статоры, кабель, СУ, трансформаторы)",
                priority: 95,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.Дата_прихода_на_базу", check: "not_equals", value: "Данные.Дата_приходной_накладной" },
                    { field: "Данные.Номер_приходной_накладной", check: "not_empty", value: "" }
                ],
                mainAction: "calculate",
                actionDetails: "Верная_дата_прихода = Дата_приходной_накладной + 1 час\nНовый_номер_приходки = LOOKUP(Номер_приходной_накладной, 'WO_справочник')\nНомер_накладной_из_WO = EXTRACT(wo_num, 'invoice_number')",
                dataPreparation: [
                    { action: "Привести все даты к формату YYYY-MM-DD HH:mm:ss" },
                    { action: "Унифицировать названия полей дат прихода (Дата прихода на базу ГЗ → Дата_прихода_на_базу)" }
                ],
                validationChecks: [
                    { check: "Верная_дата_прихода заполнена для всех записей с накладными" },
                    { check: "Разница между датами не должна превышать 7 дней" }
                ]
            }
        },
        {
            title: "Дата финального теста позже даты расходки",
            description: "Финальный тест проведен после отгрузки оборудования",
            data: {
                ruleName: "Контроль последовательности тест-расходка",
                problem: "Дата финального теста позже даты расходки - логическое нарушение процесса",
                priority: 100,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.дата_финального_теста", check: "after", value: "Данные.Дата_расходки" },
                    { field: "Данные.Номер_расходки", check: "not_empty", value: "" }
                ],
                mainAction: "calculate",
                actionDetails: "Разница_между_фин_тестом_и_расходкой = DATEDIFF(дата_финального_теста, Дата_расходки)\nЕсли 1 то дата_прихода=дата_первого_теста=дата_разборки=дата_сборки=дата_фин_теста=дате_расходки +1час\nЕсли 2 Дата_первого_теста=дате_разборки=дате_сборки=дата_фин_теста=дате_расходки",
                dataPreparation: [
                    { action: "Рассчитать разницу в днях между финальным тестом и расходкой" },
                    { action: "Определить тип ремонта: 1 - экспресс (< 1 дня), 2 - стандартный" }
                ],
                validationChecks: [
                    { check: "Финальный тест должен быть завершен ДО расходки" },
                    { check: "Для экспресс-ремонта все даты должны быть синхронизированы" }
                ]
            }
        },
        {
            title: "Проверка паспортов ГЗ и ПЭД",
            description: "Валидация соответствия компонентов в сборке",
            data: {
                ruleName: "Контроль соответствия паспортов",
                problem: "Необходимо проверить связь между паспортами ГЗ и ПЭД в одной сборке",
                priority: 85,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.Номер_паспорта_ГЗ", check: "not_empty", value: "" },
                    { field: "Данные.Номер_паспорта_ПЭД", check: "not_empty", value: "" }
                ],
                mainAction: "calculate",
                actionDetails: "Паспорта_совпадают = IF(Номер_паспорта_ГЗ = Номер_паспорта_ПЭД, 'СВЯЗАННЫЕ_КОМПОНЕНТЫ', 'РАЗНЫЕ_КОМПОНЕНТЫ')\nСтатус_проверки = IF(Паспорта_совпадают = 'СВЯЗАННЫЕ_КОМПОНЕНТЫ' OR piece_type IN ('ПХНГ', 'NEW', 'КНГ'), 'ВАЛИДНАЯ_СБОРКА', 'ТРЕБУЕТ_ПРОВЕРКИ')",
                dataPreparation: [
                    { action: "Убрать пробелы и привести номера паспортов к верхнему регистру" },
                    { action: "Проверить формат номеров паспортов на соответствие стандарту" }
                ],
                validationChecks: [
                    { check: "Поле проверки паспортов заполнено для всех записей" },
                    { check: "Для связанных компонентов проверить соответствие типов оборудования" }
                ]
            }
        },
        {
            title: "Дата первого теста больше даты разборки",
            description: "Нарушена последовательность операций ремонта",
            data: {
                ruleName: "Коррекция последовательности тест-разборка",
                problem: "Дата первого теста больше даты разборки - оборудование разобрали до тестирования",
                priority: 90,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.Дата_первого_теста", check: "after", value: "Данные.Дата_разборки" },
                    { field: "Данные.Дата_разборки", check: "not_empty", value: "" }
                ],
                mainAction: "calculate",
                actionDetails: "Верная_дата_разборки = Дата_первого_теста + 1 час\nДата_сборки_добавляем_час_к_новой_дате_разборки = Верная_дата_разборки + 1 час\nДата_финального_теста_добавляем_час_к_новой_дате_сборки = Дата_сборки_добавляем_час_к_новой_дате_разборки + 1 час",
                dataPreparation: [
                    { action: "Рассчитать разницу между разборкой и тестом" },
                    { action: "Рассчитать разницу между датой разборки и Датой WO" }
                ],
                validationChecks: [
                    { check: "Последовательность: первый тест → разборка → сборка → финальный тест" },
                    { check: "Минимальный интервал между операциями - 1 час" }
                ]
            }
        },
        {
            title: "Дата финального теста раньше даты сборки",
            description: "Финальный тест проведен до завершения сборки",
            data: {
                ruleName: "Исправление инверсии сборка-тест",
                problem: "Дата финального теста меньше даты сборки или разборки - нарушена логика",
                priority: 95,
                conditionMode: "any",
                conditions: [
                    { field: "Данные.дата_финального_теста", check: "before", value: "Данные.Дата_сборки" },
                    { field: "Данные.дата_финального_теста", check: "before", value: "Данные.Дата_разборки" }
                ],
                mainAction: "calculate",
                actionDetails: "Новая_дата_первого_теста = MIN(Дата_прихода, Дата_первого_теста) + 1 час\nНовая_дата_разборки = Новая_дата_первого_теста + 1 час\nНовая_дата_сборки = Новая_дата_разборки + 1 час\nНовая_дата_фин_теста = Новая_дата_сборки + 1 час",
                dataPreparation: [
                    { action: "Привести все даты к единому формату с учетом времени" },
                    { action: "Рассчитать разницу между фин тестом и расходкой" }
                ],
                validationChecks: [
                    { check: "Все новые даты должны соблюдать правильную последовательность" },
                    { check: "Разница между операциями должна быть положительной" }
                ]
            }
        },
        {
            title: "Дата сборки раньше даты прихода",
            description: "Собрали оборудование до его поступления на базу",
            data: {
                ruleName: "Коррекция даты сборки относительно прихода",
                problem: "Дата сборки меньше даты прихода или первого теста - невозможная ситуация",
                priority: 90,
                conditionMode: "any",
                conditions: [
                    { field: "Данные.Дата_сборки", check: "before", value: "Данные.Дата_прихода" },
                    { field: "Данные.Дата_сборки", check: "before", value: "Данные.Дата_первого_теста" }
                ],
                mainAction: "calculate",
                actionDetails: "Минимальная_начальная_дата = GREATEST(Дата_прихода, Дата_первого_теста)\nНовая_дата_сборки = Минимальная_начальная_дата + 2 часа\nНовая_дата_финального_теста = Новая_дата_сборки + 1 час",
                dataPreparation: [
                    { action: "Проверить наличие всех обязательных дат" },
                    { action: "Определить минимально возможную дату начала операций" }
                ],
                validationChecks: [
                    { check: "Дата сборки должна быть после прихода и первого теста" },
                    { check: "Соблюдение технологической последовательности операций" }
                ]
            }
        },
        {
            title: "Дата разборки больше даты сборки",
            description: "Разборка произошла после сборки",
            data: {
                ruleName: "Исправление инверсии разборка-сборка",
                problem: "Дата разборки больше даты сборки - нарушена последовательность операций",
                priority: 85,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.Дата_разборки", check: "after", value: "Данные.Дата_сборки" },
                    { field: "Данные.разница_между_датой_сборки_и_разборки", check: "less_than", value: "0" }
                ],
                mainAction: "calculate",
                actionDetails: "разница_между_датой_сборки_и_разборки = DATEDIFF(Дата_сборки, Дата_разборки)\nЕсли разница < 0: SWAP(Дата_разборки, Дата_сборки)\nПометить_инверсию = IF(разница < 0, 'ДАТЫ_ПЕРЕПУТАНЫ', 'OK')",
                dataPreparation: [
                    { action: "Рассчитать разницу между датой сборки и разборки в днях" },
                    { action: "Проверить корректность последовательности всех дат" }
                ],
                validationChecks: [
                    { check: "Разборка всегда должна быть ДО сборки" },
                    { check: "Разница должна быть положительной (минимум 1 час)" }
                ]
            }
        },
        {
            title: "Оборудование дважды по одной накладной",
            description: "Дубликаты записей с одинаковым номером накладной",
            data: {
                ruleName: "Обработка дубликатов по накладным",
                problem: "Оборудование дважды пришедшее по одной накладной - требуется дедупликация",
                priority: 80,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.rec_doc_num", check: "duplicate", value: "" },
                    { field: "Данные.piece_type", check: "not_empty", value: "" }
                ],
                mainAction: "mark_error",
                actionDetails: "На_удаление_с_цифрой_1 = IF(ROW_NUMBER() OVER (PARTITION BY rec_doc_num ORDER BY timestamp_obmen DESC) > 1, 1, 0)\nСтатус_дубля = CASE WHEN На_удаление_с_цифрой_1 = 1 THEN 'ДУБЛЬ_УДАЛИТЬ' ELSE 'ОРИГИНАЛ' END",
                dataPreparation: [
                    { action: "Сортировать по rec_doc_num и timestamp_obmen DESC" },
                    { action: "Подсчитать количество записей для каждого rec_doc_num" }
                ],
                validationChecks: [
                    { check: "По каждому rec_doc_num должна остаться только одна запись" },
                    { check: "Помеченные на удаление записи должны быть архивированы" }
                ],
                duplicateKeys: "rec_doc_num",
                duplicateStrategy: "keep_latest"
            }
        },
        {
            title: "Различаются номера КЛ в таблицах",
            description: "Несоответствие номеров между системами учета",
            data: {
                ruleName: "Синхронизация номеров КЛ",
                problem: "Номера КЛ различаются между 'Перечнем новых' и '01 Ремонты'",
                priority: 70,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.№_КЛ_из_Перечня", check: "not_equals", value: "Данные.№_КЛ_из_01_Ремонты" },
                    { field: "Данные.№_ремкарты", check: "not_empty", value: "" }
                ],
                mainAction: "replace",
                actionDetails: "Основной_номер_КЛ = COALESCE(№_КЛ_из_01_Ремонты, №_КЛ_из_Перечня)\nrec_serial_входящий_номер = PARSE_SERIAL(Основной_номер_КЛ, 'incoming')\nissued_serial_исходящий_номер = PARSE_SERIAL(Основной_номер_КЛ, 'outgoing')\n№_ОС = LOOKUP(wo_num, 'inventory_number')",
                dataPreparation: [
                    { action: "Сопоставить даты выполнения из Перечня новых и 01 Ремонты" },
                    { action: "Извлечь wo_num из номера ремкарты для связи" }
                ],
                validationChecks: [
                    { check: "Основной номер КЛ должен быть определен для всех записей" },
                    { check: "Серийные номера должны быть корректно извлечены" }
                ]
            }
        },
        {
            title: "Не определившиеся заводы-изготовители",
            description: "Стандартизация названий производителей",
            data: {
                ruleName: "Нормализация производителей оборудования",
                problem: "Разные написания одного производителя (Южгидромаш-Арсенал vs ООО ЮЖГИДРОМАШ)",
                priority: 60,
                conditionMode: "any",
                conditions: [
                    { field: "Данные.manufactor", check: "contains", value: "Южгидромаш" },
                    { field: "Данные.manufactor", check: "in_list", value: "Не определившееся,Не определившиеся заводы" },
                    { field: "Данные.manufactor", check: "empty", value: "" }
                ],
                mainAction: "normalize",
                actionDetails: "Полное_наименование = MAP_MANUFACTURER(manufactor, 'full_name')\nКраткое_наименование = MAP_MANUFACTURER(manufactor, 'short_name')\nСтандартизированный_производитель = CASE WHEN manufactor LIKE '%Южгидромаш%' THEN 'ООО \"ЮЖГИДРОМАШ\"' ELSE LOOKUP_MANUFACTURER(manufactor) END",
                dataPreparation: [
                    { action: "Загрузить справочник производителей" },
                    { action: "Создать таблицу соответствий различных написаний" }
                ],
                validationChecks: [
                    { check: "Все производители должны быть из утвержденного справочника" },
                    { check: "Не должно остаться записей с 'Не определившееся'" }
                ]
            }
        }
    ];

    return (
        <div className="examples-panel">
            {/* Типовые правила для УЭЦН */}
            <div className="accordion-section">
                <div 
                    className="accordion-header"
                    onClick={() => setTypicalRulesExpanded(!typicalRulesExpanded)}
                >
                    <h3>
                        <span className={`accordion-toggle ${typicalRulesExpanded ? 'expanded' : ''}`}>▶</span>
                        📚 Типовые правила для УЭЦН
                    </h3>
                </div>
                {typicalRulesExpanded && (
                    <div className="accordion-content">
                        <p>Нажмите на пример, чтобы загрузить его настройки в форму</p>
                        <div className="examples-grid">
                            {examples.map(example => (
                                <ExampleCard
                                    key={example.data.ruleName}
                                    title={example.title}
                                    description={example.description}
                                    onClick={() => onLoadExample(example.data)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Проделанная работа */}
            <div className="accordion-section">
                <div 
                    className="accordion-header"
                    onClick={() => setHistoricalWorkExpanded(!historicalWorkExpanded)}
                >
                    <h3>
                        <span className={`accordion-toggle ${historicalWorkExpanded ? 'expanded' : ''}`}>▶</span>
                        📜 Проделанная работа
                    </h3>
                </div>
                {historicalWorkExpanded && (
                    <div className="accordion-content">
                        {isLoadingHistorical ? (
                            <div className="loading-state">Загрузка исторических данных...</div>
                        ) : historicalData ? (
                            <HistoricalWork 
                                historicalData={historicalData}
                                onUpdate={handleHistoricalDataUpdate}
                                onLoadRules={handleLoadRules}
                            />
                        ) : (
                            <div className="no-data-state">
                                <p>Исторические данные не найдены</p>
                                <button 
                                    className="btn btn-secondary"
                                    onClick={loadHistoricalData}
                                >
                                    Повторить загрузку
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamplesPanel; 