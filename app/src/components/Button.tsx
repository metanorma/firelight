// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { ButtonType } from '../Enums';
import styles from './Button.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    text: string;
    type: ButtonType;
    onClick: () => void;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Button(props: OwnProps) {
    const { onClick, text, type } = props;
    const classes = [styles['button'], styles[`button--${type}`]];
    return (
        <button onClick={onClick} className={classes.join(' ')}>
            <span className={styles['button__text']}>{text}</span>
        </button>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default Button;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
