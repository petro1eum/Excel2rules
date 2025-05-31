import { useRef, useCallback } from 'react';

export const useDragDrop = (showToast) => {
    const draggedField = useRef(null);
    const dragHelper = useRef(null);

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
                
                this.value = text.substring(0, start) + fieldName + text.substring(end);
                this.focus();
                this.setSelectionRange(start + fieldName.length, start + fieldName.length);
                
                showToast(`Поле "${fieldName}" добавлено`, 'success');
                
                // Триггерим change событие для автодополнения
                this.dispatchEvent(new Event('input', { bubbles: true }));
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
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            const start = activeElement.selectionStart;
            const end = activeElement.selectionEnd;
            const text = activeElement.value;
            activeElement.value = text.substring(0, start) + fieldName + text.substring(end);
            activeElement.focus();
            activeElement.setSelectionRange(start + fieldName.length, start + fieldName.length);
            showToast(`Поле "${fieldName}" вставлено`);
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