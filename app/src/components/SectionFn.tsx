// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from 'react';
import DisplayNode, { XMLNode } from './DisplayNode';
import './SectionFn.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
    data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionFn({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        const attrs: any[] = data.attributes;
        const idRow = Object.values(attrs).find(
            (attr: any) => attr?.name === 'id'
        );
        const id = idRow?.value ? idRow.value : '';

        const referenceRow = Object.values(attrs).find(
            (attr: any) => attr?.name === 'reference'
        );
        const reference = referenceRow?.value ? referenceRow.value : '';


        return (
            <a className="fn" href={`#table${reference}`}>{reference}</a>
        );
    }, [data]);

    return <>{renderContent}</>;
}
