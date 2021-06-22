// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import Button from './Button';
import styles from './ProgressBar.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    action: string;
    isLarge: boolean;
    onClick: () => void;
    progress: {
        max: number;
        value: number;
    };
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function ProgressBar(props: OwnProps) {
    const { progress, action, onClick, isLarge } = props;
    const { value, max } = progress;
    const percent = `${Math.round((value / max) * 100)}%`;
    const extraProgressBarClass = isLarge
        ? styles['progress-bar--large']
        : styles['progress-bar--little'];
    const extraProgressBarWrapClass = isLarge
        ? styles['progress-bar__wrap--large']
        : styles['progress-bar__wrap--little'];
    return (
        <aside
            className={[styles['progress-bar'], extraProgressBarClass].join(
                ' '
            )}
        >
            <div
                className={[
                    styles['progress-bar__wrap'],
                    extraProgressBarWrapClass
                ].join(' ')}
            >
                <div className={styles['progress-bar__progress']}>
                    <div
                        className={styles['progress-bar__progress__value']}
                        style={{ width: percent }}
                        title={percent}
                    />
                </div>
                <output
                    className={styles['progress-bar__output']}
                    title={percent}
                >
                    {value} / {max}
                </output>
            </div>
            <Button title={action} onClick={onClick} />
        </aside>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default ProgressBar;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
