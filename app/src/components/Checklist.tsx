// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { SimpleChecklist } from '../Types';
import styles from './Checklist.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    checklist: SimpleChecklist;
    handleChange: (key: string) => void;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Checklist(props: OwnProps) {
    const { checklist, handleChange } = props;
    const items = [];
    for (const [key, value] of Object.entries(checklist)) {
        items.push(
            <li key={key}>
                <label>
                    <input
                        onChange={(e) => handleChange(e.target.value)}
                        type="checkbox"
                        checked={value}
                        value={key}
                    />
                    <span>{key}</span>
                </label>
            </li>
        );
    }
    return <ul className={styles['checklist']}>{items}</ul>;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default Checklist;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
