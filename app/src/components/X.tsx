// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './X.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    text: string;
    onClick: () => void;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function X(props: OwnProps) {
    const { onClick, text } = props;
    return (
        <button className={styles['x']} onClick={onClick} title={text}>
            <span className={styles['x__x']}></span>
        </button>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default X;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
