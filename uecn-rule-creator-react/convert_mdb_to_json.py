#!/usr/bin/env python3
import subprocess
import json
import csv
import io
import os

def get_table_list(mdb_file):
    """Получить список таблиц из MDB файла"""
    try:
        result = subprocess.run(['mdb-tables', '-1', mdb_file], 
                               capture_output=True, text=True, check=True)
        tables = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]
        return tables
    except subprocess.CalledProcessError as e:
        print(f"Ошибка получения списка таблиц: {e}")
        return []

def export_table_to_json(mdb_file, table_name, output_dir, max_rows=1000):
    """Экспортировать таблицу в JSON формат"""
    try:
        # Экспортируем в CSV
        result = subprocess.run(['mdb-export', mdb_file, table_name], 
                               capture_output=True, text=True, check=True)
        
        # Конвертируем CSV в JSON
        csv_data = result.stdout
        csv_reader = csv.DictReader(io.StringIO(csv_data))
        
        rows = []
        for i, row in enumerate(csv_reader):
            if i >= max_rows:
                break
            # Очищаем пустые строки и None значения
            cleaned_row = {}
            for key, value in row.items():
                if value and value.strip():
                    cleaned_row[key] = value.strip()
            if cleaned_row:  # Добавляем только не пустые строки
                rows.append(cleaned_row)
        
        # Сохраняем в JSON файл
        safe_table_name = table_name.replace(' ', '_').replace('/', '_').replace('№', 'num')
        output_file = os.path.join(output_dir, f"{safe_table_name}.json")
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                'table_name': table_name,
                'total_rows': len(rows),
                'data': rows
            }, f, ensure_ascii=False, indent=2)
        
        print(f"Экспортировано {len(rows)} строк из таблицы '{table_name}' в {output_file}")
        return len(rows)
        
    except subprocess.CalledProcessError as e:
        print(f"Ошибка экспорта таблицы '{table_name}': {e}")
        return 0
    except Exception as e:
        print(f"Общая ошибка при экспорте таблицы '{table_name}': {e}")
        return 0

def main():
    mdb_file = "public/data/Cable.mdb"
    output_dir = "public/data/exported"
    
    # Создаем выходную папку если не существует
    os.makedirs(output_dir, exist_ok=True)
    
    # Получаем список таблиц
    tables = get_table_list(mdb_file)
    print(f"Найдено {len(tables)} таблиц в базе данных")
    
    # Экспортируем ВСЕ таблицы
    exported_summary = {}
    
    print(f"Начинаем экспорт всех {len(tables)} таблиц...")
    
    for i, table in enumerate(tables, 1):
        print(f"\n[{i}/{len(tables)}] Экспортируем таблицу: '{table}'")
        row_count = export_table_to_json(mdb_file, table, output_dir, max_rows=2000)  # Увеличиваем лимит строк
        exported_summary[table] = row_count
    
    # Создаем файл с метаданными
    metadata = {
        'source_file': mdb_file,
        'export_date': subprocess.run(['date'], capture_output=True, text=True).stdout.strip(),
        'total_tables_in_db': len(tables),
        'exported_tables': exported_summary,
        'all_tables': tables
    }
    
    with open(os.path.join(output_dir, 'metadata.json'), 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    print(f"\nЭкспорт завершен. Экспортировано {len(exported_summary)} таблиц.")
    print(f"Метаданные сохранены в {output_dir}/metadata.json")

if __name__ == "__main__":
    main() 