// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './StealthTitle.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    isVisible: boolean;
    title: string;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function StealthTitle(props: OwnProps) {
    const { isVisible: isStealthTitleVisible, title } = props;
    const extraClass = isStealthTitleVisible
        ? 'stealth-title--reveal'
        : 'stealth-title--cloak';
    return (
        <h1
            title={title}
            className={[styles['stealth-title'], styles[extraClass]].join(' ')}
        >
            {title}
        </h1>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default StealthTitle;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
