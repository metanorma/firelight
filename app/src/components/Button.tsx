// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './Button.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    title: string;
    onClick: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Button(props: OwnProps) {
    const { onClick, title } = props;
    return (
        <button onClick={onClick} className={styles['button']}>
            <span className={styles['button__title']}>{title}</span>
        </button>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default Button;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
