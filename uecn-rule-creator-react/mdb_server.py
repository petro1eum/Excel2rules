#!/usr/bin/env python3
"""
Простой сервер для конвертации MDB файлов в JSON
"""

import os
import json
import tempfile
import subprocess
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

app = Flask(__name__)
CORS(app)

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_mdbtools():
    """Проверяем наличие mdb-tools"""
    try:
        result = subprocess.run(['mdb-ver', '--help'], 
                                capture_output=True, text=True, timeout=5)
        return True
    except:
        return False

def get_table_info(mdb_path, table_name):
    """Получаем информацию о таблице"""
    try:
        # Получаем схему таблицы
        schema_result = subprocess.run(['mdb-schema', mdb_path, '-T', table_name], 
                                       capture_output=True, text=True, timeout=30)
        
        # Получаем список колонок
        columns_result = subprocess.run(['mdb-export', mdb_path, table_name], 
                                        capture_output=True, text=True, timeout=30)
        
        if columns_result.returncode != 0:
            logger.error(f"Ошибка получения данных таблицы {table_name}: {columns_result.stderr}")
            return None
            
        lines = columns_result.stdout.strip().split('\n')
        if len(lines) < 1:
            return None
            
        # Первая строка - заголовки
        headers = [col.strip('"') for col in lines[0].split(',')]
        
        # Получаем пример данных из второй строки если она есть
        sample_values = {}
        if len(lines) > 1:
            values = lines[1].split(',')
            for i, header in enumerate(headers):
                if i < len(values):
                    sample_value = values[i].strip('"').strip()
                    if sample_value and sample_value != header:
                        sample_values[header] = sample_value
        
        # Подсчитываем количество строк
        count_result = subprocess.run(['mdb-count', mdb_path, table_name], 
                                      capture_output=True, text=True, timeout=30)
        row_count = 0
        if count_result.returncode == 0:
            try:
                row_count = int(count_result.stdout.strip())
            except:
                row_count = len(lines) - 1 if len(lines) > 1 else 0
        
        # Формируем информацию о колонках
        columns = []
        for header in headers:
            columns.append({
                'name': header,
                'sample_value': sample_values.get(header, '')
            })
            
        return {
            'name': table_name,
            'columns': columns,
            'row_count': row_count
        }
        
    except Exception as e:
        logger.error(f"Ошибка обработки таблицы {table_name}: {str(e)}")
        return None

@app.route('/api/convert-mdb', methods=['POST'])
def convert_mdb():
    try:
        # Проверяем наличие mdb-tools
        if not check_mdbtools():
            return jsonify({
                'success': False,
                'error': 'mdb-tools не установлен. Выполните: brew install mdb-tools'
            }), 500
        
        # Проверяем наличие файла
        if 'mdb_file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'Файл не предоставлен'
            }), 400
            
        file = request.files['mdb_file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'Файл не выбран'
            }), 400
        
        # Сохраняем файл во временную директорию
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mdb') as tmp_file:
            file.save(tmp_file.name)
            tmp_path = tmp_file.name
        
        try:
            # Получаем список таблиц
            result = subprocess.run(['mdb-tables', '-1', tmp_path], 
                                    capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                return jsonify({
                    'success': False,
                    'error': f'Ошибка чтения MDB файла: {result.stderr}'
                }), 400
            
            table_names = [name.strip() for name in result.stdout.strip().split('\n') if name.strip()]
            
            if not table_names:
                return jsonify({
                    'success': False,
                    'error': 'В MDB файле не найдено таблиц'
                }), 400
            
            # Обрабатываем каждую таблицу
            tables = []
            for table_name in table_names:
                table_info = get_table_info(tmp_path, table_name)
                if table_info:
                    tables.append(table_info)
            
            if not tables:
                return jsonify({
                    'success': False,
                    'error': 'Не удалось обработать ни одну таблицу'
                }), 400
            
            logger.info(f"Успешно обработано {len(tables)} таблиц из файла {file.filename}")
            
            return jsonify({
                'success': True,
                'tables': tables,
                'message': f'Обработано {len(tables)} таблиц'
            })
            
        finally:
            # Удаляем временный файл
            try:
                os.unlink(tmp_path)
            except:
                pass
                
    except Exception as e:
        logger.error(f"Ошибка конвертации MDB: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Внутренняя ошибка сервера: {str(e)}'
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Проверка работоспособности сервера"""
    return jsonify({
        'status': 'ok',
        'mdb_tools_available': check_mdbtools()
    })

if __name__ == '__main__':
    print("🚀 Запуск MDB сервера на http://localhost:8000")
    print("📋 Доступные endpoints:")
    print("   POST /api/convert-mdb - конвертация MDB файлов")
    print("   GET  /api/health     - проверка состояния")
    
    app.run(host='0.0.0.0', port=8000, debug=True) 