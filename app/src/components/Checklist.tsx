// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    checklist: { [key: string]: boolean };
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
                    {key}
                </label>
            </li>
        );
    }
    return <ul>{items}</ul>;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default Checklist;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
