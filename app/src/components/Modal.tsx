// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './Modal.module.css';
import X from './X';

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
            <div className={styles['modal__content']}>
                <span
                    className={[
                        styles['modal__hotspot'],
                        styles['modal__hotspot--close']
                    ].join(' ')}
                >
                    <X
                        text="Close Modal"
                        onClick={handleClose}
                        showDesktop
                        showMobile
                    />
                </span>
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
