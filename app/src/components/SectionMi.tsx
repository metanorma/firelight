// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from 'react';
import DisplayNode, { XMLNode } from './DisplayNode';
import './SectionMath.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
    data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionMi({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        const attrs: any[] = data.attributes;
        const idRow = Object.values(attrs).find(
            (attr: any) => attr?.name === 'id'
        );
        const id = idRow?.value ? idRow.value : '';

        const childs: any[] = data.childNodes;
        console.log(data, 'stem data')

        return (
            <div className="mi" id={id}>
                <DisplayNode data={data.childNodes} />
            </div>
        );
    }, [data]);

    return <>{renderContent}</>;
}
