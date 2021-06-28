// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './Button.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    text: string;
    onClick: () => void;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Button(props: OwnProps) {
    const { onClick, text: title } = props;
    return (
        <button onClick={onClick} className={styles['button']}>
            <span className={styles['button__text']}>{title}</span>
        </button>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default Button;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
