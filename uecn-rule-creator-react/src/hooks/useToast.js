import { useState, useRef, useEffect } from 'react';

export const useToast = () => {
    const [toast, setToast] = useState({ message: '', type: 'info', show: false });
    const toastTimer = useRef(null);

    // Отладка изменений состояния toast
    useEffect(() => {
        console.log('Toast состояние изменилось:', toast);
    }, [toast]);

    // Очищаем таймер при размонтировании компонента
    useEffect(() => {
        return () => {
            if (toastTimer.current) {
                clearTimeout(toastTimer.current);
                console.log('Таймер очищен при размонтировании');
            }
        };
    }, []);

    const hideToast = () => {
        console.log('hideToast вызван');
        if (toastTimer.current) {
            clearTimeout(toastTimer.current);
            toastTimer.current = null;
            console.log('Таймер остановлен вручную');
        }
        setToast(prev => ({ ...prev, show: false }));
        console.log('Toast скрыт вручную');
    };

    const showToast = (message, type = 'info') => {
        console.log('showToast вызван:', { message, type, currentTimer: !!toastTimer.current });

        // Очищаем предыдущий таймер если он есть
        if (toastTimer.current) {
            clearTimeout(toastTimer.current);
            toastTimer.current = null;
            console.log('Предыдущий таймер очищен');
        }

        // Сразу показываем новый toast
        setToast({ message, type, show: true });
        console.log('Toast показан');

        // Устанавливаем таймер на скрытие
        toastTimer.current = setTimeout(() => {
            console.log('Таймер сработал, скрываем toast');
            setToast(prev => {
                console.log('Текущее состояние перед скрытием:', prev);
                return { ...prev, show: false };
            });
            toastTimer.current = null;
            console.log('Таймер завершен');
        }, 3000);

        console.log('Новый таймер установлен на 3 секунды');
    };

    return { toast, showToast, hideToast };
}; 