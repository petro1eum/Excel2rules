# 🚀 Инструкция по запуску приложения

## Обзор
Система состоит из двух компонентов:
- **Frontend** (React + Vite) - интерфейс для создания правил
- **Backend** (Flask) - API для обработки MDB/Access файлов

## 📋 Требования

### Системные требования
- Node.js 18+ 
- Python 3.8+
- macOS/Linux (для mdb-tools)

### Установка зависимостей

#### 1. Установка mdb-tools (для работы с Access базами)
```bash
# macOS
brew install mdb-tools

# Ubuntu/Debian
sudo apt-get install mdb-tools

# Проверка установки
mdb-ver --help
```

#### 2. Установка Python зависимостей
```bash
pip install flask flask-cors
```

#### 3. Установка Node.js зависимостей
```bash
cd uecn-rule-creator-react
npm install
```

## 🖥️ Запуск приложения

### Способ 1: Автоматический запуск (рекомендуется)
```bash
# В директории uecn-rule-creator-react
npm run start:all
```

### Способ 2: Ручной запуск в 2 терминалах

#### Терминал 1: Запуск Backend (MDB API)
```bash
cd uecn-rule-creator-react
python mdb_server.py
```
Ожидайте сообщение:
```
🚀 Запуск MDB сервера на http://localhost:8000
📋 Доступные endpoints:
   POST /api/convert-mdb - конвертация MDB файлов
   GET  /api/health     - проверка состояния
```

#### Терминал 2: Запуск Frontend
```bash
cd uecn-rule-creator-react
npm run dev
```
Ожидайте сообщение:
```
➜  Local:   http://localhost:5173/
```

## 🌐 Доступ к приложению

- **Frontend**: http://localhost:5173 (или 5174 если 5173 занят)
- **Backend API**: http://localhost:8000
- **Проверка здоровья API**: http://localhost:8000/api/health

## 📁 Структура проекта

```
uecn-rule-creator-react/
├── src/                    # React приложение
│   ├── components/         # Компоненты UI
│   ├── hooks/             # React хуки
│   └── App.jsx            # Главный компонент
├── public/                # Статические файлы
│   └── data/              # Файлы данных (игнорируются git)
├── mdb_server.py          # Flask API сервер
├── package.json           # Node.js зависимости
└── vite.config.js         # Конфигурация Vite
```

## 🔧 Использование

### Загрузка файлов
1. Откройте frontend в браузере
2. Нажмите "📁 Загрузить Excel или Access файлы"
3. Выберите файлы (.xlsx, .xls, .mdb, .accdb)
4. Файлы обработаются и появятся в списке

### Создание правил
1. Выберите листы/таблицы для использования
2. Перетащите поля в правила создания
3. Настройте параметры правил
4. Протестируйте и сохраните

## 🐛 Решение проблем

### Ошибка "mdb-tools не установлен"
```bash
brew install mdb-tools  # macOS
sudo apt-get install mdb-tools  # Linux
```

### Ошибка "Buffer is not defined"
- Убедитесь что используете серверный API (не клиентские библиотеки)
- Перезапустите backend сервер

### Ошибка "ECONNREFUSED localhost:8000"
- Запустите backend: `python mdb_server.py`
- Проверьте что порт 8000 свободен: `lsof -i :8000`

### Ошибка "Port 5173 is in use"
- Vite автоматически использует следующий свободный порт (5174, 5175...)
- Или остановите процесс на порту: `lsof -ti:5173 | xargs kill`

## 📊 Поддерживаемые форматы

### Excel файлы
- ✅ .xlsx (Excel 2007+)
- ✅ .xls (Excel 97-2003)

### Access файлы  
- ✅ .mdb (Access 97-2019)
- ✅ .accdb (Access 2007+)

## 🔍 Логи и отладка

### Backend логи
Логи Flask сервера отображаются в терминале где запущен `python mdb_server.py`

### Frontend логи
Откройте DevTools в браузере (F12) → Console

### Проверка API
```bash
# Проверка здоровья API
curl http://localhost:8000/api/health

# Ожидаемый ответ:
# {"status":"ok","mdb_tools_available":true}
```

## 🚨 Важные замечания

1. **Размер файлов**: MDB файлы могут быть большими (несколько сотен MB), обработка может занять время
2. **Безопасность**: Приложение предназначено для локальной разработки
3. **Данные**: Файлы в `public/data/` исключены из git - делитесь ими отдельно
4. **Кодировка**: При проблемах с русскими символами проверьте кодировку исходных файлов

## 📝 Добавление в package.json

Добавьте этот скрипт в `package.json` для удобного запуска:

```json
{
  "scripts": {
    "start:backend": "python mdb_server.py",
    "start:frontend": "vite",
    "start:all": "concurrently \"python mdb_server.py\" \"vite\"",
    "dev": "vite"
  }
}
```

Установите concurrently для одновременного запуска:
```bash
npm install --save-dev concurrently
``` 