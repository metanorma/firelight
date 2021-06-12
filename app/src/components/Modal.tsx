// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './Modal.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    isOpen: boolean;
    children: JSX.Element | JSX.Element[];
    handleClose: () => void;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Modal(props: OwnProps) {
    const { isOpen, handleClose, children } = props;
    if (!isOpen) {
        return null;
    }
    return (
        <aside className={styles['modal']}>
            <div className={styles['modal__modal']}>
                <button
                    onClick={handleClose}
                    className={styles['modal__close']}
                >
                    Close Modal
                </button>
                <div className={styles['modal__guts']}>{children}</div>
            </div>
            <div
                onClick={handleClose}
                className={styles['modal__overlay']}
            ></div>
        </aside>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default Modal;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
