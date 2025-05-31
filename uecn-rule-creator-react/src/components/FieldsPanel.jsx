const FieldItemPanel = ({ fieldName, fullRef, description, onFieldClick, onFieldDragStart, onFieldDragEnd }) => (
    <div 
        className="field-item-panel"
        draggable="true"
        data-field={fullRef}
        onClick={() => onFieldClick(fullRef)}
        onDragStart={(e) => onFieldDragStart(e, fullRef)}
        onDragEnd={onFieldDragEnd}
    >
        <div className="field-name">{fieldName}</div>
        {description !== fieldName && <div className="field-description">{description}</div>}
        <div className="field-full-reference">{fullRef}</div>
    </div>
);

const FieldsGroup = ({ fileInfo, sheetInfo, onFieldClick, onFieldDragStart, onFieldDragEnd }) => {
    const sheetTitle = fileInfo.hasMultipleSheets ? 
        `${sheetInfo.alias} (${sheetInfo.name})` : 
        sheetInfo.alias;

    return (
        <div className="fields-group">
            <div className="fields-group-title">
                <span>📄</span>
                <span>{sheetTitle}</span>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>({fileInfo.name})</span>
            </div>
            {sheetInfo.fields.map(field => {
                const fullRef = `${sheetInfo.alias}.${field}`;
                const desc = sheetInfo.descriptions[field];
                return (
                    <FieldItemPanel
                        key={field}
                        fieldName={field}
                        fullRef={fullRef}
                        description={desc}
                        onFieldClick={onFieldClick}
                        onFieldDragStart={onFieldDragStart}
                        onFieldDragEnd={onFieldDragEnd}
                    />
                );
            })}
        </div>
    );
};

const FieldsPanel = ({ 
    isOpen, 
    loadedFiles, 
    onClose, 
    onFieldClick,
    onFieldDragStart,
    onFieldDragEnd
}) => {
    const hasFiles = Object.keys(loadedFiles).length > 0;
    const hasSelectedSheets = hasFiles && Object.values(loadedFiles).some(fileInfo => 
        Object.values(fileInfo.sheets).some(sheet => sheet.selected)
    );

    let content;
    if (!hasFiles) {
        content = (
            <p style={{ color: '#666', textAlign: 'center', marginTop: '50px' }}>
                Загрузите Excel файлы для просмотра доступных полей
            </p>
        );
    } else if (!hasSelectedSheets) {
        content = (
            <p style={{ color: '#666', textAlign: 'center', marginTop: '50px' }}>
                Выберите листы в загруженных файлах для просмотра полей
            </p>
        );
    } else {
        content = Object.values(loadedFiles).map(fileInfo => {
            const selectedSheets = Object.values(fileInfo.sheets).filter(sheet => sheet.selected);
            
            if (selectedSheets.length === 0) {
                return null;
            }

            return selectedSheets.map(sheetInfo => (
                <FieldsGroup
                    key={`${fileInfo.id}_${sheetInfo.name}`}
                    fileInfo={fileInfo}
                    sheetInfo={sheetInfo}
                    onFieldClick={onFieldClick}
                    onFieldDragStart={onFieldDragStart}
                    onFieldDragEnd={onFieldDragEnd}
                />
            ));
        });
    }

    return (
        <div className={`fields-panel ${isOpen ? 'open' : ''}`}>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '20px' 
            }}>
                <h3 style={{ margin: 0 }}>Доступные поля</h3>
                <button 
                    className="btn btn-secondary" 
                    style={{ padding: '8px 16px' }} 
                    onClick={onClose}
                >
                    ✕
                </button>
            </div>
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
                {content}
            </div>
        </div>
    );
};

export default FieldsPanel; 