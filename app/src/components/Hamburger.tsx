// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './Hamburger.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    isActive: boolean;
    activeText: string;
    inactiveText: string;
    onClick: () => void;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Hamburger(props: OwnProps) {
    const { onClick, isActive, activeText, inactiveText } = props;
    const extraHamburgerClass = isActive
        ? 'hamburger--active'
        : 'hamburger--inactive';
    const extraHamburgerStackClass = isActive
        ? 'hamburger__stack--active'
        : 'hamburger__stack--inactive';
    return (
        <button
            className={[styles['hamburger'], styles[extraHamburgerClass]].join(
                ' '
            )}
            onClick={onClick}
            title={isActive ? activeText : inactiveText}
        >
            <span
                className={[
                    styles['hamburger__stack'],
                    styles[extraHamburgerStackClass]
                ].join(' ')}
            ></span>
        </button>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default Hamburger;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
