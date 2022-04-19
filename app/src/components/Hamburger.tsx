// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './Hamburger.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    isDesktop: boolean;
    isActive: boolean;
    activeText: string;
    inactiveText: string;
    onClick: () => void;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Hamburger(props: OwnProps) {
    const { onClick, isActive, activeText, inactiveText, isDesktop } = props;
    const extraHamburgerActivityClass = isActive
        ? 'hamburger--active'
        : 'hamburger--inactive';
    const extraHamburgerRWDClass = isDesktop
        ? 'hamburger--is-desktop'
        : 'hamburger--is-mobile';
    const extraHamburgerStackClass = isActive
        ? 'hamburger__stack--active'
        : 'hamburger__stack--inactive';
    return (
        <button
            className={[
                styles['hamburger'],
                styles[extraHamburgerActivityClass],
                styles[extraHamburgerRWDClass]
            ].join(' ')}
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
