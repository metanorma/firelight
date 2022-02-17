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

        let footnote: any = localStorage.getItem('footnote');
        
        let num = 0;
        if (!footnote) num = 1;
        else num = parseInt(footnote) + 1;

        return (
            <>
                <a className="fn" href={`#table${reference}`}>
                    {reference}
                </a>
                <aside id={`table${reference}`} className="footnote" style={{bottom:`${num  * -40 } px`}}>
                    <p>
                        <a className="foot-note-ref" href={`#table${reference}`}><sup>{reference ? reference: ''}</sup></a>
                        <DisplayNode data={data.childNodes} />
                    </p>                    
                </aside>
            </>
        );
    }, [data]);

    return <>{renderContent}</>;
}
