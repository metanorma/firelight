// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './ButtonGroup.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    children: JSX.Element[];
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function ButtonGroup(props: OwnProps) {
    const { children } = props;
    return <fieldset className={styles['button-group']}>{children}</fieldset>;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default ButtonGroup;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
