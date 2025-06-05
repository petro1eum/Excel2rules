import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

export const useFileManager = (showToast) => {
    const [loadedFiles, setLoadedFiles] = useState({});
    const [availableFields, setAvailableFields] = useState([]);
    const [fieldDescriptions, setFieldDescriptions] = useState({});

    const generateFileAlias = useCallback((fileName) => {
        // Генерируем короткий алиас из имени файла
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
        const cleaned = nameWithoutExt
            .replace(/[^а-яА-Яa-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
        
        // Если алиас уже существует, добавляем число
        let alias = cleaned;
        let counter = 2;
        while (Object.values(loadedFiles).some(f => f.alias === alias)) {
            alias = cleaned + counter;
            counter++;
        }
        
        return alias;
    }, [loadedFiles]);

    const extractHeadersForSheet = (sheet) => {
        const fieldNames = [];
        const descriptions = {};
        
        if (!sheet['!ref']) {
            return { fieldNames, descriptions };
        }
        
        const range = XLSX.utils.decode_range(sheet['!ref']);
        let headerRow = [];
        let dataRow = [];
        let headerRowIndex = -1;
        let dataRowIndex = -1;
        
        // Проверяем строки для поиска заголовков
        for (let row = range.s.r; row <= Math.min(range.s.r + 10, range.e.r); row++) {
            const rowData = [];
            let nonEmptyCount = 0;
            
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cell = sheet[XLSX.utils.encode_cell({r: row, c: col})];
                let value = '';
                
                if (cell && cell.v !== undefined && cell.v !== null) {
                    value = String(cell.v).trim();
                    if (value !== '') {
                        nonEmptyCount++;
                    }
                }
                
                rowData.push({col, value});
            }
            
            // Строка считается валидной, если в ней есть хотя бы 2 непустые ячейки
            if (nonEmptyCount >= 2) {
                if (headerRowIndex === -1) {
                    // Первая валидная строка - заголовки
                    headerRowIndex = row;
                    headerRow = rowData;
                    console.log('Found header row at index:', row, 'with data:', rowData.map(r => r.value).filter(v => v));
                } else if (dataRowIndex === -1) {
                    // Вторая валидная строка - примеры данных
                    dataRowIndex = row;
                    dataRow = rowData;
                    console.log('Found data row at index:', row, 'with data:', rowData.map(r => r.value).filter(v => v));
                    break;
                }
            }
        }
        
        if (headerRowIndex === -1 || headerRow.length === 0) {
            console.log('No valid header row found');
            return { fieldNames, descriptions };
        }
        
        // Обрабатываем заголовки
        headerRow.forEach((headerCell, index) => {
            const fieldName = headerCell.value;
            if (fieldName && fieldName.trim() !== '') {
                fieldNames.push(fieldName);
                
                // Создаем описание с примером данных
                let description = fieldName;
                if (dataRowIndex !== -1 && dataRow[index] && dataRow[index].value) {
                    const sampleValue = dataRow[index].value;
                    if (sampleValue && sampleValue !== fieldName) {
                        // Ограничиваем длину примера
                        const trimmedSample = sampleValue.length > 40 ? 
                            sampleValue.substring(0, 37) + '...' : sampleValue;
                        description = `Пример: ${trimmedSample}`;
                    }
                }
                
                descriptions[fieldName] = description;
            }
        });
        
        console.log('Final extracted fields:', fieldNames);
        console.log('Descriptions:', descriptions);
        
        return { fieldNames, descriptions };
    };

    const handleMdbFile = useCallback(async (file) => {
        try {
            showToast(`Конвертирование MDB файла "${file.name}"...`, 'info');
            
            const formData = new FormData();
            formData.append('mdb_file', file);
            
            const response = await fetch('/api/convert-mdb', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Неизвестная ошибка конвертации');
            }
            
            const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const alias = generateFileAlias(file.name);
            
            // Обрабатываем полученные таблицы
            const sheets = {};
            let totalFields = 0;
            
            result.tables.forEach((tableInfo, index) => {
                const sheetAlias = result.tables.length > 1 ? 
                    `${alias}_${tableInfo.name.replace(/[^а-яА-Яa-zA-Z0-9]/g, '_')}` : alias;
                
                // Создаем описания полей
                const descriptions = {};
                tableInfo.columns.forEach(column => {
                    if (column.sample_value) {
                        const trimmedSample = String(column.sample_value).length > 40 ? 
                            String(column.sample_value).substring(0, 37) + '...' : String(column.sample_value);
                        descriptions[column.name] = `Пример: ${trimmedSample}`;
                    } else {
                        descriptions[column.name] = column.name;
                    }
                });
                
                sheets[tableInfo.name] = {
                    name: tableInfo.name,
                    alias: sheetAlias,
                    fields: tableInfo.columns.map(col => col.name),
                    descriptions: descriptions,
                    fieldsCount: tableInfo.columns.length,
                    selected: true,
                    originalIndex: index,
                    rowCount: tableInfo.row_count,
                    isMdbTable: true
                };
                
                totalFields += tableInfo.columns.length;
            });
            
            const newFile = {
                id: fileId,
                name: file.name,
                alias: alias,
                sheets: sheets,
                totalFields: totalFields,
                hasMultipleSheets: result.tables.length > 1,
                isMdbFile: true
            };

            setLoadedFiles(prev => ({
                ...prev,
                [fileId]: newFile
            }));
            
            const tableText = result.tables.length > 1 ? 
                `${result.tables.length} таблиц, ${totalFields} полей` : 
                `${totalFields} полей`;
            
            // Показываем детали для первой таблицы
            const firstTableName = Object.keys(sheets)[0];
            if (firstTableName) {
                const firstTable = sheets[firstTableName];
                const sampleFields = firstTable.fields.slice(0, 3).join(', ');
                const detailText = firstTable.fields.length > 3 ? 
                    `Поля: ${sampleFields}...` : 
                    `Поля: ${sampleFields}`;
                
                showToast(`База данных "${file.name}" загружена (${tableText}). ${detailText}`, 'success');
            } else {
                showToast(`База данных "${file.name}" загружена (${tableText})`, 'success');
            }
        } catch (error) {
            showToast(`Ошибка при чтении MDB файла: ${error.message}`, 'error');
        }
    }, [generateFileAlias, showToast]);

    const handleFile = useCallback((file) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const arrayBuffer = e.target.result;
                
                // Определяем тип файла по расширению
                const fileExtension = file.name.toLowerCase().split('.').pop();
                
                if (fileExtension === 'mdb' || fileExtension === 'accdb') {
                    handleMdbFile(file);
                    return;
                }
                
                // Обработка Excel файлов
                const data = new Uint8Array(arrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                
                const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                const alias = generateFileAlias(file.name);
                
                // Обрабатываем все листы
                const sheets = {};
                let totalFields = 0;
                
                workbook.SheetNames.forEach((sheetName, index) => {
                    const sheet = workbook.Sheets[sheetName];
                    const sheetAlias = workbook.SheetNames.length > 1 ? 
                        `${alias}_${sheetName.replace(/[^а-яА-Яa-zA-Z0-9]/g, '_')}` : alias;
                    
                    const fields = extractHeadersForSheet(sheet);
                    
                    sheets[sheetName] = {
                        name: sheetName,
                        alias: sheetAlias,
                        fields: fields.fieldNames,
                        descriptions: fields.descriptions,
                        fieldsCount: fields.fieldNames.length,
                        selected: index === 0, // По умолчанию выбираем первый лист
                        originalIndex: index
                    };
                    
                    totalFields += fields.fieldNames.length;
                });
                
                const newFile = {
                    id: fileId,
                    name: file.name,
                    alias: alias,
                    sheets: sheets,
                    totalFields: totalFields,
                    hasMultipleSheets: workbook.SheetNames.length > 1
                };

                setLoadedFiles(prev => ({
                    ...prev,
                    [fileId]: newFile
                }));
                
                const sheetText = workbook.SheetNames.length > 1 ? 
                    `${workbook.SheetNames.length} листов, ${totalFields} полей` : 
                    `${totalFields} полей`;
                
                // Показываем детали для первого листа
                const firstSheetName = Object.keys(sheets)[0];
                const firstSheet = sheets[firstSheetName];
                const sampleFields = firstSheet.fields.slice(0, 3).join(', ');
                const detailText = firstSheet.fields.length > 3 ? 
                    `Поля: ${sampleFields}...` : 
                    `Поля: ${sampleFields}`;
                
                showToast(`Файл "${file.name}" загружен (${sheetText}). ${detailText}`, 'success');
            } catch (error) {
                showToast('Ошибка при чтении файла: ' + error.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    }, [generateFileAlias, showToast]);

    const handleMultipleFiles = useCallback((files) => {
        Array.from(files).forEach(file => {
            handleFile(file);
        });
    }, [handleFile]);



    const updateGlobalFields = useCallback(() => {
        const newAvailableFields = [];
        const newFieldDescriptions = {};
        
        Object.values(loadedFiles).forEach(fileInfo => {
            Object.values(fileInfo.sheets).forEach(sheetInfo => {
                if (sheetInfo.selected) {
                    sheetInfo.fields.forEach(field => {
                        const fullReference = `${sheetInfo.alias}.${field}`;
                        newAvailableFields.push(fullReference);
                        newFieldDescriptions[fullReference] = {
                            description: sheetInfo.descriptions[field],
                            file: fileInfo.name,
                            sheet: sheetInfo.name,
                            alias: sheetInfo.alias,
                            originalField: field
                        };
                    });
                }
            });
        });

        setAvailableFields(newAvailableFields);
        setFieldDescriptions(newFieldDescriptions);
    }, [loadedFiles]);

    const toggleSheet = useCallback((fileId, sheetName, selected) => {
        setLoadedFiles(prev => {
            if (prev[fileId] && prev[fileId].sheets[sheetName]) {
                const newFiles = { ...prev };
                newFiles[fileId].sheets[sheetName].selected = selected;
                return newFiles;
            }
            return prev;
        });

        const action = selected ? 'добавлен' : 'исключен';
        showToast(`Лист "${sheetName}" ${action}`);
    }, [showToast]);

    const selectAllSheets = useCallback((fileId) => {
        setLoadedFiles(prev => {
            if (prev[fileId]) {
                const newFiles = { ...prev };
                Object.values(newFiles[fileId].sheets).forEach(sheet => {
                    sheet.selected = true;
                });
                return newFiles;
            }
            return prev;
        });
        showToast('Все листы выбраны');
    }, [showToast]);

    const selectNoSheets = useCallback((fileId) => {
        setLoadedFiles(prev => {
            if (prev[fileId]) {
                const newFiles = { ...prev };
                Object.values(newFiles[fileId].sheets).forEach(sheet => {
                    sheet.selected = false;
                });
                return newFiles;
            }
            return prev;
        });
        showToast('Все листы исключены');
    }, [showToast]);

    const updateSheetAlias = useCallback((fileId, sheetName, newAlias) => {
        if (!newAlias.trim()) {
            showToast('Алиас листа не может быть пустым', 'error');
            return;
        }
        
        // Проверяем уникальность алиаса среди всех листов всех файлов
        let isDuplicate = false;
        Object.values(loadedFiles).forEach(fileInfo => {
            Object.values(fileInfo.sheets).forEach(sheet => {
                if (sheet.alias === newAlias.trim() && 
                    !(fileInfo.id === fileId && sheet.name === sheetName)) {
                    isDuplicate = true;
                }
            });
        });
        
        if (isDuplicate) {
            showToast('Такой алиас уже используется', 'error');
            return;
        }
        
        setLoadedFiles(prev => {
            const newFiles = { ...prev };
            newFiles[fileId].sheets[sheetName].alias = newAlias.trim();
            return newFiles;
        });

        showToast('Алиас листа обновлен');
    }, [loadedFiles, showToast]);

    const updateFileAlias = useCallback((fileId, newAlias) => {
        if (!newAlias.trim()) {
            showToast('Алиас не может быть пустым', 'error');
            return;
        }
        
        // Проверяем уникальность среди основных алиасов файлов
        const duplicate = Object.values(loadedFiles).find(f => 
            f.id !== fileId && f.alias === newAlias.trim()
        );
        
        if (duplicate) {
            showToast('Такой алиас уже используется', 'error');
            return;
        }
        
        setLoadedFiles(prev => {
            const newFiles = { ...prev };
            const fileInfo = newFiles[fileId];
            const oldAlias = fileInfo.alias;
            fileInfo.alias = newAlias.trim();
            
            // Обновляем алиасы листов если файл многостраничный
            if (fileInfo.hasMultipleSheets) {
                Object.values(fileInfo.sheets).forEach(sheetInfo => {
                    if (sheetInfo.alias.startsWith(oldAlias + '_')) {
                        const sheetSuffix = sheetInfo.alias.substring(oldAlias.length);
                        sheetInfo.alias = newAlias.trim() + sheetSuffix;
                    }
                });
            } else {
                // Для одностраничного файла обновляем алиас единственного листа
                Object.values(fileInfo.sheets).forEach(sheetInfo => {
                    if (sheetInfo.alias === oldAlias) {
                        sheetInfo.alias = newAlias.trim();
                    }
                });
            }
            
            return newFiles;
        });

        showToast('Алиас обновлен');
    }, [loadedFiles, showToast]);

    const removeFile = useCallback((fileId) => {
        if (window.confirm('Удалить этот файл из загруженных?')) {
            setLoadedFiles(prev => {
                const newFiles = { ...prev };
                delete newFiles[fileId];
                return newFiles;
            });
            showToast('Файл удален');
        }
    }, [showToast]);

    const showFileDebugInfo = useCallback((fileId) => {
        const fileInfo = loadedFiles[fileId];
        if (!fileInfo) return;
        
        let debugInfo = `📊 Структура файла: ${fileInfo.name}\n\n`;
        
        Object.entries(fileInfo.sheets).forEach(([sheetName, sheetInfo]) => {
            debugInfo += `📋 Лист: ${sheetName}\n`;
            debugInfo += `   Алиас: ${sheetInfo.alias}\n`;
            debugInfo += `   Полей: ${sheetInfo.fieldsCount}\n`;
            debugInfo += `   Выбран: ${sheetInfo.selected ? 'Да' : 'Нет'}\n`;
            
            if (sheetInfo.fields.length > 0) {
                debugInfo += `   Поля:\n`;
                sheetInfo.fields.slice(0, 10).forEach(field => {
                    const desc = sheetInfo.descriptions[field];
                    debugInfo += `     • ${field}`;
                    if (desc && desc !== field) {
                        debugInfo += ` (${desc})`;
                    }
                    debugInfo += `\n`;
                });
                
                if (sheetInfo.fields.length > 10) {
                    debugInfo += `     ... и еще ${sheetInfo.fields.length - 10} полей\n`;
                }
            }
            debugInfo += `\n`;
        });
        
        // Показываем в модальном окне или alert
        if (window.confirm(debugInfo + '\nНажмите OK для копирования в буфер обмена или Cancel для закрытия')) {
            navigator.clipboard.writeText(debugInfo).then(() => {
                showToast('Информация о структуре скопирована в буфер обмена', 'success');
            }).catch(() => {
                showToast('Не удалось скопировать в буфер обмена', 'error');
            });
        }
    }, [loadedFiles, showToast]);

    return {
        loadedFiles,
        availableFields,
        fieldDescriptions,
        handleFile,
        handleMultipleFiles,
        updateGlobalFields,
        toggleSheet,
        selectAllSheets,
        selectNoSheets,
        updateSheetAlias,
        updateFileAlias,
        removeFile,
        showFileDebugInfo
    };
}; 