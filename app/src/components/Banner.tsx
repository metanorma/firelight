// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './Banner.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    children: JSX.Element | JSX.Element[];
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Banner(props: OwnProps) {
    const { children } = props;
    return <div className={styles.banner}>{children}</div>;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default Banner;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
