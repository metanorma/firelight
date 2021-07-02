// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './X.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    text: string;
    onClick: () => void;
    showDesktop: boolean;
    showMobile: boolean;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function X(props: OwnProps) {
    const { onClick, text, showDesktop, showMobile } = props;
    const xClasses = [styles['x']];
    xClasses.push(
        showMobile ? styles['x--show-mobile'] : styles['x--hide-mobile']
    );
    xClasses.push(
        showDesktop ? styles['x--show-desktop'] : styles['x--hide-desktop']
    );
    return (
        <button className={xClasses.join(' ')} onClick={onClick} title={text}>
            <span className={styles['x__x']}></span>
        </button>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default X;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
