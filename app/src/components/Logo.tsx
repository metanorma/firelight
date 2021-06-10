// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './Logo.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Logo(props: OwnProps) {
    return (
        <h1 className={styles['logo']}>
            bsi<em className={styles['logo__dot']}>&middot;</em>
        </h1>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default Logo;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
