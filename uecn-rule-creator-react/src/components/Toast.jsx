import { useEffect } from 'react';

const Toast = ({ message, type, show, onClose }) => {
    // Отладка пропов
    useEffect(() => {
        console.log('Toast рендер с пропами:', { message, type, show });
    }, [message, type, show]);

    const handleClick = () => {
        console.log('Toast кликнут, вызываем onClose');
        if (onClose) {
            onClose();
        }
    };

    const classes = `toast ${show ? 'show' : ''} ${type}`.trim();
    console.log('Toast CSS классы:', classes);

    return (
        <div 
            className={classes}
            onClick={handleClick}
            style={{ cursor: show ? 'pointer' : 'default' }}
            title={show ? 'Нажмите, чтобы закрыть' : ''}
        >
            {message}
        </div>
    );
};

export default Toast; 