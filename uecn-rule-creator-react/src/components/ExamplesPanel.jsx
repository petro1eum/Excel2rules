const ExampleCard = ({ title, description, onClick }) => (
    <div className="example-card" onClick={onClick}>
        <div className="example-title">{title}</div>
        <div className="example-description">{description}</div>
    </div>
);

const ExamplesPanel = ({ onLoadExample }) => {
    const examples = [
        {
            id: 'duplicates',
            title: 'Объединение дубликатов с учетом каталога',
            description: 'Находит записи с одинаковым ПЗД и дополняет данными из каталога'
        },
        {
            id: 'manufacturer',
            title: 'Умное заполнение завода-изготовителя',
            description: 'Берет недостающие данные из файла-справочника по ключевому полю'
        },
        {
            id: 'dates',
            title: 'Исправление последовательности дат',
            description: 'Сверяет даты с нормативными сроками из отдельного файла'
        },
        {
            id: 'normalization',
            title: 'Нормализация названий производителей',
            description: 'Исправляет написание согласно эталонному справочнику'
        },
        {
            id: 'multisheet',
            title: 'Сверка цен между листами прайса',
            description: 'Работа с многостраничными файлами - сравнение цен между листами'
        }
    ];

    return (
        <div className="examples-panel">
            <div className="card">
                <h2 className="section-title">💡 Примеры правил</h2>
                
                {examples.map(example => (
                    <ExampleCard
                        key={example.id}
                        title={example.title}
                        description={example.description}
                        onClick={() => onLoadExample(example.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default ExamplesPanel; 