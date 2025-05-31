import { useEffect } from 'react';

const Toast = ({ message, type, show, onClose }) => {
    const handleCloseClick = (e) => {
        e.stopPropagation(); // Останавливаем всплытие события
        if (onClose) {
            onClose();
        }
    };

    const handleToastClick = () => {
        if (onClose) {
            onClose();
        }
    };

    const classes = `toast ${show ? 'show' : ''} ${type}`.trim();

    // Показываем toast только если он нужен
    if (!show && !message) {
        return null;
    }

    return (
        <div 
            className={classes}
            onClick={handleToastClick}
            style={{ cursor: show ? 'pointer' : 'default' }}
            title={show ? 'Нажмите, чтобы закрыть' : ''}
        >
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {show && (
                    <button 
                        className="toast-close-btn"
                        onClick={handleCloseClick}
                        title="Закрыть"
                        style={{
                            position: 'absolute',
                            left: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'inherit',
                            fontSize: '18px',
                            cursor: 'pointer',
                            padding: '0',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(0, 0, 0, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'none';
                        }}
                    >
                        ×
                    </button>
                )}
                <div style={{ paddingLeft: '30px' }}>
                    {message}
                </div>
            </div>
        </div>
    );
};

export default Toast; 