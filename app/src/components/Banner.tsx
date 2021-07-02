// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './Banner.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    children: JSX.Element[];
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Banner(props: OwnProps) {
    const { children } = props;
    return (
        <div className={styles.banner}>
            {children.map((child: JSX.Element) => (
                <div className={styles['banner__item']}>{child}</div>
            ))}
        </div>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default Banner;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
