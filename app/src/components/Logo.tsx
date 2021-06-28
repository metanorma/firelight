// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './Logo.module.css';
import logo from '../img/bsi-logo--white-text.svg';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Logo() {
    return <img alt="BSI logo" src={logo} className={styles['logo']} />;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default Logo;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
