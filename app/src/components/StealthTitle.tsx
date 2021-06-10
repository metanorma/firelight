// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './StealthTitle.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    isStealthTitleVisible: boolean;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function StealthTitle(props: OwnProps) {
    const { isStealthTitleVisible } = props;
    const x = isStealthTitleVisible ? 'stealth-title--reveal' : 'stealth-title--cloak';
    return <h1 className={[styles['stealth-title'], styles[x]].join(' ')}>I am the title</h1>;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default StealthTitle;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
