import { useState, useRef, useEffect } from 'react';

export const useToast = () => {
    const [toast, setToast] = useState({ message: '', type: 'info', show: false });
    const toastTimer = useRef(null);
    const lastToast = useRef({ message: '', type: '' });

    // Очищаем таймер при размонтировании компонента
    useEffect(() => {
        return () => {
            if (toastTimer.current) {
                clearTimeout(toastTimer.current);
            }
        };
    }, []);

    const hideToast = () => {
        if (toastTimer.current) {
            clearTimeout(toastTimer.current);
            toastTimer.current = null;
        }
        setToast(prev => ({ ...prev, show: false }));
    };

    const showToast = (message, type = 'info') => {
        // Предотвращаем показ одинакового сообщения подряд
        if (lastToast.current.message === message && lastToast.current.type === type && toast.show) {
            return;
        }

        lastToast.current = { message, type };

        // Очищаем предыдущий таймер если он есть
        if (toastTimer.current) {
            clearTimeout(toastTimer.current);
            toastTimer.current = null;
        }

        // Сразу показываем новый toast
        setToast({ message, type, show: true });

        // Устанавливаем таймер на скрытие
        toastTimer.current = setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
            toastTimer.current = null;
        }, 3000);
    };

    return { toast, showToast, hideToast };
}; 