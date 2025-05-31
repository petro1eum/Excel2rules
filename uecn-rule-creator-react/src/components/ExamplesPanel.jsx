const ExampleCard = ({ title, description, onClick }) => (
    <div className="example-card" onClick={onClick}>
        <div className="example-title">{title}</div>
        <div className="example-description">{description}</div>
    </div>
);

const ExamplesPanel = ({ onLoadExample }) => {
    const examples = [
        {
            title: "Различаются номера КЛ в таблицах",
            description: "Проверка соответствия номеров кабельных линий между разными источниками данных",
            data: {
                ruleName: "Проверка номеров КЛ между таблицами",
                problem: "Номера кабельных линий в разных таблицах не совпадают, что приводит к ошибкам учета",
                priority: 85,
                conditionMode: "all",
                conditions: [
                    { field: "Основная.Номер_КЛ", check: "not_equals", value: "Справочник.Номер_КЛ" },
                    { field: "Основная.Номер_КЛ", check: "not_empty", value: "" }
                ],
                mainAction: "replace",
                actionDetails: "Заменить номер КЛ в основной таблице на номер из справочника, если он там есть"
            }
        },
        {
            title: "Дата сборки меньше даты прихода",
            description: "Оборудование не может быть собрано до прихода компонентов",
            data: {
                ruleName: "Исправление дат сборки",
                problem: "Дата сборки оборудования указана раньше даты прихода компонентов или первого теста",
                priority: 90,
                conditionMode: "any",
                conditions: [
                    { field: "Данные.Дата_сборки", check: "before", value: "Данные.Дата_прихода" },
                    { field: "Данные.Дата_сборки", check: "before", value: "Данные.Дата_первого_теста" }
                ],
                mainAction: "calculate",
                actionDetails: "Установить дату сборки = максимум(дата прихода, дата первого теста) + 1 день",
                validationChecks: [
                    { check: "Дата сборки должна быть позже даты прихода всех компонентов" }
                ]
            }
        },
        {
            title: "Оборудование дважды по одной накладной",
            description: "Обнаружение и устранение дубликатов оборудования",
            data: {
                ruleName: "Устранение дубликатов по накладным",
                problem: "Одно и то же оборудование пришло дважды по одной накладной",
                priority: 95,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.Номер_накладной", check: "duplicate", value: "" },
                    { field: "Данные.Серийный_номер", check: "duplicate", value: "" }
                ],
                mainAction: "merge_duplicates",
                actionDetails: "Объединить записи с одинаковыми накладными и серийными номерами",
                duplicateKeys: "Данные.Номер_накладной, Данные.Серийный_номер",
                duplicateStrategy: "keep_most_complete"
            }
        },
        {
            title: "Не определившиеся заводы-изготовители",
            description: "Заполнение пустых заводов на основе модели оборудования",
            data: {
                ruleName: "Определение завода по модели",
                problem: "У оборудования не указан завод-изготовитель",
                priority: 70,
                conditionMode: "all",
                conditions: [
                    { field: "Данные.Завод", check: "empty", value: "" },
                    { field: "Данные.Модель", check: "not_empty", value: "" }
                ],
                mainAction: "fill",
                actionDetails: "Заполнить завод из справочника: если Модель содержит 'ЭЦН-5А' то Завод = 'Новомет', если 'УЭЦН' то 'Борец', если 'ВННП' то 'Алнас'",
                dataPreparation: [
                    { action: "Нормализовать модель к верхнему регистру" }
                ]
            }
        },
        {
            title: "Дата прихода не совпадает с приходкой",
            description: "Синхронизация дат между системами учета",
            data: {
                ruleName: "Синхронизация дат прихода насосов",
                problem: "Дата прихода насосов в основной системе не совпадает с датой в системе приходки",
                priority: 80,
                conditionMode: "all",
                conditions: [
                    { field: "Насосы.Дата_прихода", check: "not_equals", value: "Приходки.Дата_приходки" },
                    { field: "Насосы.Серийный_номер", check: "equals", value: "Приходки.Серийный_номер" }
                ],
                mainAction: "replace",
                actionDetails: "Заменить дату прихода в таблице Насосы на дату из системы приходки",
                handleConflicts: "Использовать более позднюю дату",
                handleErrors: "mark"
            }
        },
        {
            title: "Заводские номера ПЭД с одним действием",
            description: "Поиск ПЭД с неполной историей",
            data: {
                ruleName: "Проверка истории ПЭД",
                problem: "Заводские номера ПЭД имеют только одно действие в истории, что может указывать на потерю данных",
                priority: 60,
                conditionMode: "all",
                conditions: [
                    { field: "ПЭД.Заводской_номер", check: "not_empty", value: "" }
                ],
                mainAction: "mark_error",
                actionDetails: "Пометить записи ПЭД, у которых в истории менее 2 действий, для ручной проверки",
                groupBy: "ПЭД.Заводской_номер",
                validationChecks: [
                    { check: "Количество записей в группе должно быть больше 1" }
                ]
            }
        },
        {
            title: "Причины отбраковки кабеля",
            description: "Стандартизация причин отбраковки",
            data: {
                ruleName: "Нормализация причин отбраковки",
                problem: "Причины отбраковки кабеля записаны в разных форматах",
                priority: 50,
                conditionMode: "all",
                conditions: [
                    { field: "Кабель.Статус", check: "equals", value: "Отбракован" },
                    { field: "Кабель.Причина_отбраковки", check: "not_empty", value: "" }
                ],
                mainAction: "normalize",
                actionDetails: "Привести причины к стандартному справочнику: 'обрыв' → 'Обрыв жилы', 'изол' → 'Нарушение изоляции', 'корроз' → 'Коррозия'",
                dataPreparation: [
                    { action: "Убрать лишние пробелы и привести к нижнему регистру" }
                ]
            }
        },
        {
            title: "Дата финального теста раньше сборки",
            description: "Логическая проверка последовательности операций",
            data: {
                ruleName: "Корректировка дат тестирования",
                problem: "Дата финального теста указана раньше даты сборки или разборки",
                priority: 85,
                conditionMode: "any",
                conditions: [
                    { field: "Данные.Дата_фин_теста", check: "before", value: "Данные.Дата_сборки" },
                    { field: "Данные.Дата_фин_теста", check: "before", value: "Данные.Дата_разборки" }
                ],
                mainAction: "calculate",
                actionDetails: "Если дата фин. теста < даты сборки, то дата фин. теста = дата сборки + 1 день",
                validationChecks: [
                    { check: "Дата финального теста должна быть позже даты сборки" },
                    { check: "Даты должны идти в логической последовательности" }
                ]
            }
        },
        {
            title: "Типы кабельных муфт",
            description: "Стандартизация типов муфт",
            data: {
                ruleName: "Унификация типов кабельных муфт",
                problem: "Типы кабельных муфт записаны в разных форматах (МКС, мкс, МКС-120 и т.д.)",
                priority: 40,
                conditionMode: "all",
                conditions: [
                    { field: "Муфты.Тип", check: "not_empty", value: "" }
                ],
                mainAction: "normalize",
                actionDetails: "Привести все типы муфт к единому формату согласно справочнику типов",
                dataPreparation: [
                    { action: "Убрать пробелы и привести к верхнему регистру" },
                    { action: "Заменить кириллицу на латиницу где нужно (МКС → MKS)" }
                ]
            }
        },
        {
            title: "Выход из фонда без причины",
            description: "Заполнение причин выбытия оборудования",
            data: {
                ruleName: "Контроль выбытия из фонда",
                problem: "Оборудование выбыло из фонда, но не указана причина",
                priority: 75,
                conditionMode: "all",
                conditions: [
                    { field: "Фонд.Статус", check: "equals", value: "Выбыл" },
                    { field: "Фонд.Причина_выбытия", check: "empty", value: "" }
                ],
                mainAction: "fill",
                actionDetails: "Заполнить причину выбытия на основе других данных: если есть акт списания - 'Списание', если есть дата отгрузки - 'Реализация', иначе - 'Требует уточнения'",
                validationChecks: [
                    { check: "У всех выбывших единиц должна быть указана причина" }
                ]
            }
        }
    ];

    return (
        <div className="examples-panel">
            <h3>📚 Типовые правила для УЭЦН</h3>
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
    );
};

export default ExamplesPanel; 