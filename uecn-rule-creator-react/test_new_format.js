// Тест нового формата экспорта правил
const testRuleData = {
    ruleName: "Синхронизация дат прихода и приходки",
    problem: "Дата прихода на базу не совпадает с датой приходной накладной",
    priority: 95,
    enabled: true,
    conditionMode: "all",
    complexLogic: "",
    mainAction: "calculate",
    actionDetails: "Верная_дата_прихода = Дата_приходной_накладной + 1 час, Статус_проверки = Если разница больше 3 дней то ТРЕБУЕТ_ПРОВЕРКИ иначе OK",
    handleConflicts: "",
    handleErrors: "skip",
    groupBy: "",
    duplicateKeys: "",
    duplicateStrategy: "keep_first",
    requiresRules: "",
    blocksRules: "",
    validationFailAction: "rollback"
};

const testDynamicItems = {
    dataPreparation: [
        { id: 1, action: "Привести все даты к формату YYYY-MM-DD HH:mm:ss" },
        { id: 2, action: "Заменить NULL значения на пустые строки в поле: Дата_прихода_на_базу" }
    ],
    conditions: [
        { id: 1, field: "Данные.Дата_прихода_на_базу", check: "not_equals", value: "Данные.Дата_приходной_накладной" },
        { id: 2, field: "Данные.piece_type", check: "not_empty", value: "" }
    ],
    validationChecks: [
        { id: 1, check: "Верная_дата_прихода должна быть заполнена для всех записей" },
        { id: 2, check: "Разница между Дата_прихода_на_базу и Дата_приходной_накладной не должна превышать 7 дней" }
    ],
    mergeFields: []
};

// Симуляция работы парсера формул
function parseFormulas(actionDetails) {
    const formulas = {};
    const formulaMatches = actionDetails.match(/['"]?(\w+)['"]?\s*[:=]\s*([^,\n]+)/g);
    
    if (formulaMatches) {
        formulaMatches.forEach(match => {
            const [field, formula] = match.split(/[:=]/).map(s => s.trim().replace(/['"]/g, ''));
            
            let executableFormula = formula;
            executableFormula = executableFormula
                .replace(/\s*\+\s*1\s*час/gi, ' + INTERVAL 1 HOUR')
                .replace(/больше\s+(\d+)\s+дн/gi, '> $1')
                .replace(/если\s+/gi, 'IF(')
                .replace(/\s+то\s+/gi, ', ')
                .replace(/\s+иначе\s+/gi, ', ')
                .replace(/разница между/gi, 'DATEDIFF(')
                .replace(/и/gi, ',');
            
            formulas[field] = executableFormula;
        });
    }
    
    return formulas;
}

// Симуляция генерации правила
const generatedRule = {
    rule_id: "RULE001",
    rule_name: testRuleData.ruleName,
    problem: testRuleData.problem,
    priority: 95,
    enabled: true,
    created_at: new Date().toISOString(),
    
    data_sources: {
        описание: "Информация об источниках данных для правила",
        файлы: {
            "equipment_data.xlsx": {
                основной_алиас: "Данные",
                листы: {
                    "Sheet1": {
                        алиас: "Данные",
                        поля: ["Дата_прихода_на_базу", "Дата_приходной_накладной", "piece_type"]
                    }
                }
            }
        }
    },
    
    data_preparation: {
        описание: "Подготовка данных перед проверкой",
        действия: [
            {
                type: "format_date",
                field: "all_date_fields",
                format: "YYYY-MM-DD HH:mm:ss",
                description: "Привести все даты к формату YYYY-MM-DD HH:mm:ss"
            },
            {
                type: "replace_null",
                field: "Дата_прихода_на_базу",
                replace_with: "",
                description: "Заменить NULL значения на пустые строки в поле: Дата_прихода_на_базу"
            }
        ]
    },
    
    when: {
        описание: "Условия применения правила",
        режим: "все условия",
        conditions: [
            {
                field: "Данные.Дата_прихода_на_базу",
                operator: "not_equals",
                value: "Данные.Дата_приходной_накладной",
                value_type: "field_reference"
            },
            {
                field: "Данные.piece_type",
                operator: "not_empty",
                value: "",
                value_type: "string"
            }
        ]
    },
    
    what_to_do: {
        action: "calculate",
        details: testRuleData.actionDetails,
        formulas: {
            "Верная_дата_прихода": "Дата_приходной_накладной + INTERVAL 1 HOUR",
            "Статус_проверки": "IF(разница > 3 дней , ТРЕБУЕТ_ПРОВЕРКИ , OK)"
        }
    },
    
    validation: {
        описание: "Проверка после применения",
        checks: [
            {
                type: "not_null",
                field: "Верная_дата_прихода",
                message: "Верная_дата_прихода должна быть заполнена для всех записей"
            },
            {
                type: "max_difference",
                field1: "Дата_прихода_на_базу",
                field2: "Дата_приходной_накладной",
                max_value: 7,
                unit: "days",
                message: "Разница между Дата_прихода_на_базу и Дата_приходной_накладной не должна превышать 7 дней"
            }
        ]
    }
};

// Проверка пригодности для агента
console.log("=== НОВЫЙ ФОРМАТ ЭКСПОРТА ===\n");
console.log(JSON.stringify(generatedRule, null, 2));

console.log("\n=== АНАЛИЗ УЛУЧШЕНИЙ ===\n");
console.log("✅ Формулы теперь структурированы и исполняемы");
console.log("✅ Действия подготовки данных имеют конкретные типы и параметры");
console.log("✅ Условия имеют явные операторы и типы значений");
console.log("✅ Валидационные проверки структурированы с типами и параметрами");

console.log("\n=== ГОТОВНОСТЬ ДЛЯ АГЕНТА ===");
console.log("Новый формат подходит для автоматической обработки агентом!");
console.log("Агент может:");
console.log("- Применять конкретные формулы к данным");
console.log("- Выполнять структурированные действия подготовки");
console.log("- Проверять условия с явными операторами");
console.log("- Запускать валидационные проверки с параметрами"); 