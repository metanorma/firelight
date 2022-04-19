// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from 'react';
import DisplayNode, { XMLNode } from './DisplayNode';
import './SectionFormula.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
    data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionFormula({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        const attrs: any[] = data.attributes;
        const idRow = Object.values(attrs).find(
            (attr: any) => attr?.name === 'id'
        );
        const id = idRow?.value ? idRow.value : '';
console.log(data, 'formula');
        return (
            <div className="formula" id={id}>
                <DisplayNode data={data.childNodes} />
            </div>
        );
    }, [data]);

    return <>{renderContent}</>;
}
