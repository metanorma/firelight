// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './StealthTitle.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    isStealthTitleVisible: boolean;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function StealthTitle(props: OwnProps) {
    const { isStealthTitleVisible } = props;
    const extraClass = isStealthTitleVisible
        ? 'stealth-title--reveal'
        : 'stealth-title--cloak';
    return (
        <h1 className={[styles['stealth-title'], styles[extraClass]].join(' ')}>
            Standardization management system — Specification (Level 3
            questionnaire)
        </h1>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default StealthTitle;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
