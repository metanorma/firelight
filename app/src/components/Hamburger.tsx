// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './Hamburger.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    onClick: () => void;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Hamburger(props: OwnProps) {
    const { onClick } = props;
    return <button className={styles['hamburger']} onClick={onClick}>🍔</button>;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default Hamburger;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
