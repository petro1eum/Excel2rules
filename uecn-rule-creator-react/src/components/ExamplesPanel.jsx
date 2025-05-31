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

    const examples = [
        {
            title: "Несоответствие дат прихода и приходки",
            description: "Дата прихода на базу не совпадает с датой приходной накладной",
            data: {
                ruleName: "Синхронизация дат прихода и приходки",
                problem: "Дата прихода на базу не совпадает с датой приходной накладной для разных типов оборудования (ГЗ, насосы, статоры)",
                priority: 95,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.Дата_прихода_на_базу", check: "not_equals", value: "Данные.Дата_приходной_накладной" },
                    { field: "Данные.piece_type", check: "not_empty", value: "" }
                ],
                mainAction: "replace",
                actionDetails: "Создать поле 'Новый_номер_приходки' и синхронизировать даты. Использовать дату из приходной накладной как основную",
                dataPreparation: [
                    { action: "Определить тип оборудования для применения специфичных правил" }
                ],
                validationChecks: [
                    { check: "Даты должны совпадать после синхронизации" }
                ]
            }
        },
        {
            title: "Дата финального теста раньше даты сборки",
            description: "Нарушена логическая последовательность операций",
            data: {
                ruleName: "Исправление последовательности дат операций",
                problem: "Финальный тест не может быть раньше сборки. Требуется пересчет временной цепочки",
                priority: 100,
                conditionMode: "any",
                conditions: [
                    { field: "Данные.дата_финального_теста", check: "less_than", value: "Данные.Дата_сборки" },
                    { field: "Данные.дата_финального_теста", check: "less_than", value: "Данные.Дата_разборки" }
                ],
                mainAction: "calculate",
                actionDetails: "Создать новые поля: Новая_дата_разборки, Новая_дата_сборки, Новая_дата_фин_теста с правильной последовательностью",
                dataPreparation: [
                    { action: "Привести все даты к единому формату с учетом времени" }
                ],
                validationChecks: [
                    { check: "Последовательность: приход → первый тест → разборка → сборка → финальный тест" }
                ]
            }
        },
        {
            title: "Проверка соответствия паспортов ГЗ и ПЭД",
            description: "Валидация связи между компонентами одной сборки",
            data: {
                ruleName: "Контроль паспортов ГЗ и ПЭД",
                problem: "Необходимо проверить соответствие номеров паспортов ГЗ и ПЭД в одной сборке",
                priority: 85,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.Номер_паспорта_ГЗ", check: "not_empty", value: "" },
                    { field: "Данные.Номер_паспорта_ПЭД", check: "not_empty", value: "" }
                ],
                mainAction: "fill",
                actionDetails: "Добавить столбец 'Если_номер_паспорта_ГЗ=номеру_паспорта_ПЭД' для отметки связи между компонентами",
                validationChecks: [
                    { check: "Если паспорта не совпадают, пометить для ручной проверки" },
                    { check: "Проверить особые типы: КНГ, ПХНГ" }
                ]
            }
        },
        {
            title: "Дата первого теста больше даты разборки",
            description: "Разборка произошла до первичного тестирования",
            data: {
                ruleName: "Коррекция дат тестирования и разборки",
                problem: "Дата первого теста больше даты разборки - нарушена логика процесса",
                priority: 90,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.Дата_первого_теста", check: "greater_than", value: "Данные.Дата_разборки" }
                ],
                mainAction: "calculate",
                actionDetails: "Создать 'Верная_дата_разборки' = Дата_первого_теста + 1 час. Пересчитать последующие операции",
                dataPreparation: [
                    { action: "Рассчитать разницу между датами для анализа" }
                ],
                validationChecks: [
                    { check: "Минимальный интервал между операциями - 1 час" }
                ]
            }
        },
        {
            title: "Дата расходки раньше финального теста",
            description: "Оборудование расходовано до завершения тестирования",
            data: {
                ruleName: "Контроль дат расходования",
                problem: "Дата финального теста позже даты расходки - невозможная ситуация",
                priority: 95,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.дата_финального_теста", check: "greater_than", value: "Данные.Дата_расходки" },
                    { field: "Данные.Номер_расходки", check: "not_empty", value: "" }
                ],
                mainAction: "calculate",
                actionDetails: "Применить правила: Если условие=1, то все даты равны дате расходки +1час (экспресс-ремонт). Если условие=2, синхронизировать даты операций",
                validationChecks: [
                    { check: "Разница между фин.тестом и расходкой должна быть положительной" }
                ]
            }
        },
        {
            title: "Обработка дублей по одной накладной",
            description: "Оборудование дважды пришло по одной накладной",
            data: {
                ruleName: "Устранение дублирования оборудования",
                problem: "Обнаружены дубликаты оборудования с одинаковым номером накладной",
                priority: 80,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.rec_doc_num", check: "duplicate", value: "" },
                    { field: "Данные.rec_serial", check: "not_empty", value: "" }
                ],
                mainAction: "mark_error",
                actionDetails: "Добавить столбец 'На_удаление_с_цифрой_1' для пометки дубликатов. Анализировать по полям: rec_doc_num, eq_equipment_item_id",
                duplicateKeys: "rec_doc_num, rec_serial",
                duplicateStrategy: "keep_most_complete"
            }
        },
        {
            title: "Дата разборки больше даты сборки",
            description: "Сборка произошла раньше разборки",
            data: {
                ruleName: "Исправление инверсии дат сборки/разборки",
                problem: "Дата разборки больше даты сборки - нарушена последовательность",
                priority: 85,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.Дата_разборки", check: "greater_than", value: "Данные.Дата_сборки" }
                ],
                mainAction: "calculate",
                actionDetails: "Рассчитать 'разница_между_датой_сборки_и_разборки'. Если отрицательная - поменять даты местами",
                validationChecks: [
                    { check: "Разборка всегда должна быть до сборки" }
                ]
            }
        },
        {
            title: "Различаются номера КЛ в таблицах",
            description: "Несоответствие номеров между справочниками",
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
                actionDetails: "Использовать номер из '01 Ремонты' как основной. Добавить поля rec_serial, issued_serial для отслеживания",
                dataPreparation: [
                    { action: "Сопоставить даты выполнения между таблицами" }
                ]
            }
        },
        {
            title: "Обработка производителей оборудования",
            description: "Стандартизация названий заводов-изготовителей",
            data: {
                ruleName: "Нормализация производителей",
                problem: "Не определившиеся заводы и различные написания одного производителя",
                priority: 60,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.manufactor", check: "contains", value: "Южгидромаш" }
                ],
                mainAction: "normalize",
                actionDetails: "Создать столбцы: 'Полное_наименование', 'Краткое_наименование'. Стандартизировать: Южгидромаш-Арсенал → ООО \"ЮЖГИДРОМАШ\"",
                dataPreparation: [
                    { action: "Создать справочник соответствий производителей" }
                ]
            }
        },
        {
            title: "Контроль причин остановки",
            description: "Анализ причин остановки оборудования",
            data: {
                ruleName: "Обработка причин остановки",
                problem: "Необходимо систематизировать причины остановки оборудования",
                priority: 50,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.Ток_холостого_хода", check: "not_empty", value: "" }
                ],
                mainAction: "fill",
                actionDetails: "Добавить столбец 'R-0' для классификации. Использовать справочник OPEC для стандартизации причин",
                dataPreparation: [
                    { action: "Загрузить справочник причин остановки" }
                ],
                validationChecks: [
                    { check: "Причина должна соответствовать справочнику OPEC" }
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