// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from 'react';
import { createImportSpecifier } from 'typescript';
import DisplayNode, { XMLNode } from './DisplayNode';
import './SectionFn.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
    data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionFn({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        console.log(data, 'fn data');
        const attrs: any[] = data.attributes;
        const idRow = Object.values(attrs).find(
            (attr: any) => attr?.name === 'id'
        );
        const id = idRow?.value ? idRow.value : '';

        const referenceRow = Object.values(attrs).find(
            (attr: any) => attr?.name === 'reference'
        );
        const reference = referenceRow?.value ? referenceRow.value : '';

        let isReference = parseInt(reference);
        if (isNaN(isReference)) {
            return <></>
        }

        return (
            <>
                <a className="fn" href={`#table${reference}`}>
                    {reference}
                </a>
                <aside id={`table${reference}`} style={{position: 'absolute', bottom:`${parseInt(reference) * -90}px`}}>
                    <p className="footnote">
                        <a className="foot-note-ref" href={`#table${reference}`}><sup>{reference ? reference: ''}</sup></a>
                        <DisplayNode data={data.childNodes} />
                    </p>                    
                </aside>
            </>
        );
    }, [data]);

    return <>{renderContent}</>;
}
