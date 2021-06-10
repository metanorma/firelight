// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './Knob.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    onClick: () => void;
    isOpen: boolean;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Knob(props: OwnProps) {
    const { onClick, isOpen } = props;
    return (
        <button className={styles['knob']} onClick={onClick}>
            {isOpen ? '👋' : '🍔'}
        </button>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default Knob;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
