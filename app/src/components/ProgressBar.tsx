// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import Button from './Button';
import styles from './ProgressBar.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    action: string;
    onClick: () => void;
    progress: {
        max: number;
        value: number;
    };
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function ProgressBar(props: OwnProps) {
    const { progress, action, onClick } = props;
    const { value, max } = progress;
    return (
        <aside className={styles['progress-bar']}>
            <Button title="Open Checklist" onClick={onClick} />
            <output className={styles['progress-bar__output']}>
                {value} / {max}
            </output>
            <progress
                className={styles['progress-bar__progress']}
                max={max}
                value={value}
            />
        </aside>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default ProgressBar;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
