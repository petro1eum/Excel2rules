import { useRef, useCallback } from 'react';

export const useDragDrop = (showToast) => {
    const draggedField = useRef(null);
    const dragHelper = useRef(null);
    const lastFocusedInput = useRef(null);

    const handleFieldDragStart = useCallback((event, fieldName) => {
        draggedField.current = fieldName;
        event.target.classList.add('dragging');
        
        // Создаем helper элемент
        dragHelper.current = document.createElement('div');
        dragHelper.current.className = 'drag-helper';
        dragHelper.current.textContent = fieldName;
        document.body.appendChild(dragHelper.current);
        
        // Устанавливаем данные для передачи
        event.dataTransfer.setData('text/plain', fieldName);
        event.dataTransfer.effectAllowed = 'copy';
        
        // Скрываем стандартное изображение drag
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.globalAlpha = 0;
        event.dataTransfer.setDragImage(canvas, 0, 0);
    }, []);

    const handleFieldDragEnd = useCallback((event) => {
        event.target.classList.remove('dragging');
        if (dragHelper.current) {
            document.body.removeChild(dragHelper.current);
            dragHelper.current = null;
        }
        draggedField.current = null;
        
        // Убираем все drop-zone состояния
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.remove('drag-over');
        });
    }, []);

    const setupDropZone = useCallback((element) => {
        if (element.dataset.dropZoneSetup) return;
        element.dataset.dropZoneSetup = 'true';
        
        element.classList.add('drop-zone');
        
        // Отслеживаем фокус на этом элементе
        element.addEventListener('focus', () => {
            lastFocusedInput.current = element;
        });
        
        // Добавляем индикатор drop
        if (!element.querySelector('.drop-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'drop-indicator';
            element.parentNode.style.position = 'relative';
            element.parentNode.appendChild(indicator);
        }
        
        element.addEventListener('dragover', function(event) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
            this.classList.add('drag-over');
        });
        
        element.addEventListener('dragleave', function(event) {
            // Проверяем, что мы действительно покинули элемент
            if (!this.contains(event.relatedTarget)) {
                this.classList.remove('drag-over');
            }
        });
        
        element.addEventListener('drop', function(event) {
            event.preventDefault();
            this.classList.remove('drag-over');
            
            const fieldName = event.dataTransfer.getData('text/plain');
            if (fieldName) {
                const start = this.selectionStart || 0;
                const end = this.selectionEnd || 0;
                const text = this.value || '';
                
                // Обновляем значение
                const newValue = text.substring(0, start) + fieldName + text.substring(end);
                
                // Для React нужно использовать нативный setter
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
                
                if (this.tagName === 'INPUT') {
                    nativeInputValueSetter.call(this, newValue);
                } else if (this.tagName === 'TEXTAREA') {
                    nativeTextareaValueSetter.call(this, newValue);
                }
                
                // Создаем и диспатчим событие input для React
                const inputEvent = new Event('input', { bubbles: true });
                this.dispatchEvent(inputEvent);
                
                // Устанавливаем фокус и позицию курсора
                this.focus();
                this.setSelectionRange(start + fieldName.length, start + fieldName.length);
                
                showToast(`Поле "${fieldName}" добавлено`, 'success');
            }
        });
    }, [showToast]);

    const setupAllDropZones = useCallback(() => {
        // Настраиваем все существующие input и textarea как drop zones
        document.querySelectorAll('input[type="text"], textarea').forEach(input => {
            setupDropZone(input);
        });
        
        // Наблюдаем за добавлением новых элементов
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Настраиваем новые поля как drop zones
                        const newInputs = node.querySelectorAll('input[type="text"], textarea');
                        newInputs.forEach(input => setupDropZone(input));
                        
                        // Если сам элемент является полем ввода
                        if (node.matches && node.matches('input[type="text"], textarea')) {
                            setupDropZone(node);
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        return () => observer.disconnect();
    }, [setupDropZone]);

    // Обновляем позицию drag helper
    const setupDragHelper = useCallback(() => {
        const handleDragOver = (event) => {
            if (dragHelper.current) {
                dragHelper.current.style.left = event.clientX + 'px';
                dragHelper.current.style.top = event.clientY + 'px';
            }
        };

        document.addEventListener('dragover', handleDragOver);
        return () => document.removeEventListener('dragover', handleDragOver);
    }, []);

    const insertField = useCallback((fieldName) => {
        // Сначала пробуем активный элемент
        let targetElement = document.activeElement;
        
        // Если активный элемент не input/textarea, используем последний сфокусированный
        if (!targetElement || (targetElement.tagName !== 'INPUT' && targetElement.tagName !== 'TEXTAREA')) {
            targetElement = lastFocusedInput.current;
        }
        
        // Если все еще нет подходящего элемента, ищем первый видимый input
        if (!targetElement || (targetElement.tagName !== 'INPUT' && targetElement.tagName !== 'TEXTAREA')) {
            targetElement = document.querySelector('input[type="text"]:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])');
        }
        
        if (targetElement && (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA')) {
            const start = targetElement.selectionStart || 0;
            const end = targetElement.selectionEnd || 0;
            const text = targetElement.value || '';
            
            // Вычисляем новое значение
            const newValue = text.substring(0, start) + fieldName + text.substring(end);
            
            // Используем нативный setter для обновления значения
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            
            if (targetElement.tagName === 'INPUT') {
                nativeInputValueSetter.call(targetElement, newValue);
            } else if (targetElement.tagName === 'TEXTAREA') {
                nativeTextareaValueSetter.call(targetElement, newValue);
            }
            
            // Создаем событие input для React
            const inputEvent = new Event('input', { bubbles: true });
            targetElement.dispatchEvent(inputEvent);
            
            // Фокусируемся и устанавливаем курсор
            targetElement.focus();
            targetElement.setSelectionRange(start + fieldName.length, start + fieldName.length);
            
            // Обновляем ссылку на последний активный элемент
            lastFocusedInput.current = targetElement;
            
            showToast(`Поле "${fieldName}" вставлено в ${targetElement.placeholder || 'поле'}`, 'success');
        } else {
            showToast('Сначала кликните в поле, куда нужно вставить данные', 'warning');
        }
    }, [showToast]);

    return {
        handleFieldDragStart,
        handleFieldDragEnd,
        setupDropZone,
        setupAllDropZones,
        setupDragHelper,
        insertField
    };
}; 