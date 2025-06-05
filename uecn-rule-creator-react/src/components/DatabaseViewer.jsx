import React, { useState, useEffect } from 'react';

const DatabaseViewer = () => {
  const [metadata, setMetadata] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      const response = await fetch('/data/exported/metadata.json');
      const data = await response.json();
      setMetadata(data);
    } catch (error) {
      console.error('Ошибка загрузки метаданных:', error);
    }
  };

  const loadTableData = async (tableName) => {
    setLoading(true);
    try {
      // Преобразуем название таблицы в имя файла точно так же, как это делает Python скрипт
      const fileName = tableName
        .replace(/\s+/g, '_')
        .replace(/\//g, '_')
        .replace(/№/g, 'num')
        .replace(/"/g, '"')  // сохраняем кавычки как есть
        .replace(/\?/g, '_')
        .replace(/:/g, '_')
        .replace(/\*/g, '_')
        .replace(/</g, '_')
        .replace(/>/g, '_')
        .replace(/\|/g, '_');
      
      const response = await fetch(`/data/exported/${fileName}.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setTableData(data);
      setSelectedTable(tableName);
      setCurrentPage(1);
      setSearchTerm('');
    } catch (error) {
      console.error('Ошибка загрузки данных таблицы:', error);
      alert(`Ошибка загрузки таблицы "${tableName}": ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = tableData ? tableData.data.filter(row => {
    return Object.values(row).some(value => 
      value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  }) : [];

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const renderTableSelector = () => {
    if (!metadata) return <div>Загрузка метаданных...</div>;

    // Группируем таблицы по типам
    const mainTables = metadata.all_tables.filter(name => 
      name.includes('Ремонты') || name.includes('ремкарты') || name === 'Собственник' || name === 'Заводы'
    );
    
    const referenceTables = metadata.all_tables.filter(name => 
      name.includes('Справочник') || name.includes('Типы') || name.includes('Техники')
    );
    
    const reportTables = metadata.all_tables.filter(name => 
      name.includes('отбраковка') || name.includes('Отчет') || name.includes('Копия')
    );
    
    const otherTables = metadata.all_tables.filter(name => 
      !mainTables.includes(name) && !referenceTables.includes(name) && !reportTables.includes(name)
    );

    const renderTableGroup = (title, tables, color) => (
      <div className="table-group" key={title}>
        <h4 style={{ color, marginTop: '15px', marginBottom: '8px' }}>{title}</h4>
        <div className="table-buttons">
          {tables.map(tableName => (
            <button
              key={tableName}
              onClick={() => loadTableData(tableName)}
              className={`table-btn ${selectedTable === tableName ? 'active' : ''}`}
              title={`Строк: ${metadata.exported_tables[tableName] || 'неизвестно'}`}
            >
              <span className="table-name">{tableName}</span>
              <span className="table-count">({metadata.exported_tables[tableName] || 0})</span>
            </button>
          ))}
        </div>
      </div>
    );

    return (
      <div className="database-info">
        <h3>База данных Cable.mdb</h3>
        <div className="db-stats">
          <span>📊 Всего таблиц: {metadata.total_tables_in_db}</span>
          <span>📁 Экспортировано: {Object.keys(metadata.exported_tables).length}</span>
          <span>📅 Дата экспорта: {new Date(metadata.export_date).toLocaleString('ru-RU')}</span>
        </div>
        
        {renderTableGroup('🔧 Основные таблицы', mainTables, '#2563eb')}
        {renderTableGroup('📚 Справочники', referenceTables, '#059669')}
        {renderTableGroup('📊 Отчеты и копии', reportTables, '#dc2626')}
        {renderTableGroup('📁 Прочие таблицы', otherTables, '#7c3aed')}
      </div>
    );
  };

  const renderTableData = () => {
    if (!tableData) return null;

    const columns = tableData.data.length > 0 ? Object.keys(tableData.data[0]) : [];

    return (
      <div className="table-viewer">
        <div className="table-header">
          <h4>📋 {tableData.table_name}</h4>
          <div className="table-controls">
            <input
              type="text"
              placeholder="🔍 Поиск..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input"
            />
            <span className="data-info">
              Показано: {paginatedData.length} из {filteredData.length} записей
            </span>
          </div>
        </div>

        {paginatedData.length > 0 ? (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.map(column => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, index) => (
                    <tr key={index}>
                      {columns.map(column => (
                        <td key={column} title={row[column]}>
                          {row[column] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  ← Назад
                </button>
                <span className="page-info">
                  Страница {currentPage} из {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Вперед →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="no-data">
            {searchTerm ? `Нет данных по запросу "${searchTerm}"` : 'Нет данных для отображения'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="database-viewer">
      {renderTableSelector()}
      {loading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          Загрузка данных таблицы...
        </div>
      )}
      {renderTableData()}
    </div>
  );
};

export default DatabaseViewer; 