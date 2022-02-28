// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from 'react';
import DisplayNode, { XMLNode } from './DisplayNode';
import './SectionExample.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
    data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionExample({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        const attrs: any[] = data.attributes;
        const idRow = Object.values(attrs).find(
            (attr: any) => attr?.name === 'id'
        );
        const id = idRow?.value ? idRow.value : '';
        const nameRow: any = Object.values(data.childNodes).find((child: any) => {
            return child.tagName === 'name';
        });
        let name = ' ';
        if (nameRow?.childNodes && nameRow.childNodes[0]) {
            name = nameRow.childNodes[0].data;
        }
        Object.values(data.childNodes).map((child: any, index: number) => {
            if (child?.tagName === 'name') delete data.childNodes[index];
        }); console.log(name, 'name')
        return (
            <>
                {name && <p className="sourceTitle">{name}</p>}
                <div className="example">
                    <DisplayNode data={data.childNodes} />
                </div>
            </>
        );
    }, [data]);

    return <>{renderContent}</>;
}
