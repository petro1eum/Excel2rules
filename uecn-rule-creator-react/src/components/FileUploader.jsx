import { useRef, useState } from 'react';

const SheetItem = ({ fileId, sheetName, sheetInfo, onToggleSheet, onUpdateSheetAlias, onToggleFields }) => {
    const [showFields, setShowFields] = useState(false);
    
    const handleToggleFields = () => {
        setShowFields(!showFields);
        onToggleFields?.(fileId, sheetName, !showFields);
    };

    return (
        <div className={`sheet-item ${sheetInfo.selected ? 'selected' : ''}`}>
            <div className="sheet-main-row">
                <button 
                    className={`sheet-toggle-fields ${showFields ? 'expanded' : ''}`}
                    onClick={handleToggleFields}
                    title="Показать/скрыть поля"
                >
                    {showFields ? '▼' : '▶'}
                </button>
                <div className="sheet-name" title={sheetName}>{sheetName}</div>
                <div className="sheet-fields-count">{sheetInfo.fieldsCount} полей</div>
                <input 
                    type="checkbox" 
                    className="sheet-checkbox"
                    checked={sheetInfo.selected}
                    onChange={(e) => onToggleSheet(fileId, sheetName, e.target.checked)}
                />
            </div>
            <div className={`sheet-fields-preview ${showFields ? 'show' : ''}`}>
                {sheetInfo.fields.slice(0, 5).map(field => (
                    <span key={field} className="sheet-field-item">{field}</span>
                ))}
                {sheetInfo.fields.length > 5 && (
                    <span style={{color: '#888', fontStyle: 'italic'}}>
                        ...и еще {sheetInfo.fields.length - 5} полей
                    </span>
                )}
            </div>
            <div className="sheet-alias-row">
                <label>Алиас:</label>
                <input 
                    type="text" 
                    value={sheetInfo.alias}
                    onChange={(e) => onUpdateSheetAlias(fileId, sheetName, e.target.value)}
                    placeholder="Имя листа"
                    disabled={!sheetInfo.selected}
                />
            </div>
        </div>
    );
};

const FileItem = ({ fileId, fileInfo, onUpdateFileAlias, onRemoveFile, onShowDebugInfo, onToggleSheet, onSelectAllSheets, onSelectNoSheets, onUpdateSheetAlias }) => {
    const selectedSheets = Object.values(fileInfo.sheets).filter(sheet => sheet.selected);
    const selectedCount = selectedSheets.length;
    const totalSheets = Object.keys(fileInfo.sheets).length;

    return (
        <div className="file-item">
            <div className="file-item-info">
                <span className="file-icon">📄</span>
                <div style={{ flex: 1 }}>
                    <div className="file-name">{fileInfo.name}</div>
                    <div className="fields-count">
                        {fileInfo.hasMultipleSheets ? 
                            `${totalSheets} листов, выбрано: ${selectedCount}` : 
                            `${fileInfo.totalFields} полей`}
                    </div>
                </div>
                <div className="file-alias">
                    <label style={{ fontSize: '0.9rem', color: '#666' }}>Алиас:</label>
                    <input 
                        type="text" 
                        value={fileInfo.alias}
                        onChange={(e) => onUpdateFileAlias(fileId, e.target.value)}
                        placeholder="Короткое имя"
                    />
                </div>
            </div>
            <div className="file-actions">
                <button 
                    className="btn-mini" 
                    onClick={() => onShowDebugInfo(fileId)} 
                    title="Показать структуру файла"
                >
                    🔍
                </button>
                <button 
                    className="file-remove-btn" 
                    onClick={() => onRemoveFile(fileId)}
                >
                    Удалить
                </button>
            </div>
            
            <div className="sheet-selection">
                {fileInfo.hasMultipleSheets ? (
                    <div className="sheets-header">
                        <span>📋 Листы файла:</span>
                        <div className="sheets-actions">
                            <button className="btn-mini" onClick={() => onSelectAllSheets(fileId)}>
                                Выбрать все
                            </button>
                            <button className="btn-mini" onClick={() => onSelectNoSheets(fileId)}>
                                Снять все
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="sheets-header">
                        <span>📋 Лист файла:</span>
                    </div>
                )}
                {Object.entries(fileInfo.sheets).map(([sheetName, sheetInfo]) => (
                    <SheetItem
                        key={sheetName}
                        fileId={fileId}
                        sheetName={sheetName}
                        sheetInfo={sheetInfo}
                        onToggleSheet={onToggleSheet}
                        onUpdateSheetAlias={onUpdateSheetAlias}
                    />
                ))}
            </div>
        </div>
    );
};

const FileUploader = ({ 
    loadedFiles, 
    onFileUpload, 
    onUpdateFileAlias,
    onRemoveFile,
    onShowDebugInfo,
    onToggleSheet,
    onSelectAllSheets,
    onSelectNoSheets,
    onUpdateSheetAlias
}) => {
    const fileInputRef = useRef(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onFileUpload(files);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            onFileUpload(files);
        }
    };

    const hasFiles = Object.keys(loadedFiles).length > 0;

    return (
        <div className="card" style={{ marginBottom: '30px' }}>
            <h2 className="section-title">📊 Загрузка данных</h2>
            <div 
                className={`file-upload-area ${isDragOver ? 'drag-over' : ''}`}
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".xlsx,.xls" 
                    multiple 
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📁</div>
                <p style={{ marginBottom: '10px', fontWeight: 500 }}>
                    Перетащите Excel файлы сюда или нажмите для выбора
                </p>
                <p style={{ fontSize: '0.85rem', color: '#666' }}>
                    Можно загрузить несколько файлов (справочники, каталоги, основные данные)
                </p>
                <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '8px' }}>
                    ✨ Поддерживаются многостраничные файлы - вы сможете выбрать нужные листы
                </p>
            </div>
            
            {hasFiles && (
                <div className="files-list" style={{ display: 'block' }}>
                    <h3 style={{ marginBottom: '15px', color: '#1976d2' }}>Загруженные файлы:</h3>
                    <div>
                        {Object.entries(loadedFiles).map(([fileId, fileInfo]) => (
                            <FileItem
                                key={fileId}
                                fileId={fileId}
                                fileInfo={fileInfo}
                                onUpdateFileAlias={onUpdateFileAlias}
                                onRemoveFile={onRemoveFile}
                                onShowDebugInfo={onShowDebugInfo}
                                onToggleSheet={onToggleSheet}
                                onSelectAllSheets={onSelectAllSheets}
                                onSelectNoSheets={onSelectNoSheets}
                                onUpdateSheetAlias={onUpdateSheetAlias}
                            />
                        ))}
                    </div>
                    <p style={{ marginTop: '15px', fontSize: '0.85rem', color: '#666' }}>
                        💡 Совет: используйте короткие имена (алиасы) для удобной работы с полями. 
                        Например: <span className="field-reference">Каталог.Модель</span> или <span className="field-reference">Данные.Дата_прихода</span>
                    </p>
                    <p style={{ marginTop: '10px', fontSize: '0.85rem', color: '#666' }}>
                        📋 Многостраничные файлы: для файлов с несколькими листами можно выбрать нужные листы и задать им отдельные алиасы. 
                        Например: <span className="field-reference">Прайс_Основной.Цена</span> и <span className="field-reference">Прайс_Скидки.Процент</span>
                    </p>
                </div>
            )}
        </div>
    );
};

export default FileUploader; 