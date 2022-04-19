// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from 'react';
import DisplayNode, { XMLNode } from './DisplayNode';
import './SectionTerm.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
    data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionTerm({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        const attrs: any[] = data.attributes;
        const idRow = Object.values(attrs).find(
            (attr: any) => attr?.name === 'id'
        );
        const id = idRow?.value ? idRow.value : '';

        const childs: any[] = data.childNodes;
        const termSource = Object.values(childs).find(
            (child: any) => child?.tagName === 'termsource'
        );

        let modified = '';
        let bibitemid = '';
        let bibitemText = '';

        if (termSource?.childNodes) {
          // console.log(termSource.childNodes, 'term child')
            let origin: any = Object.values(termSource?.childNodes).find(
              (child: any) => child?.tagName === 'origin'
            )
            
            let reference: any = Object.values(origin?.attributes).find(
              (attr: any) => attr?.nodeName === 'bibitemid'
            )
            bibitemid = reference?.value;
            
            reference = Object.values(origin?.attributes).find(
              (attr: any) => attr?.nodeName === 'citeas'
            )
            bibitemText = reference?.value;

            if (origin?.childNodes) {
              // console.log(origin.childNodes, 'origin reference')
              // referenceIndex = origin?.childNodes[0]?.childNodes[0]?.childNodes[0]?.childNodes[0]?.data;
              // console.log(origin?.childNodes, 'origin')
            }
            

            let modification: any = Object.values(termSource.childNodes).find(
              (child: any) => child?.tagName === 'modification'
            );
            
            if (modification?.childNodes) {
              let p: any = Object.values(modification?.childNodes).find(
                (child: any) => child?.tagName === 'p'
              )
              let value: string | any = p?.childNodes[0].data;
              if (value) {
                modified = `modified - ${value}`;
                console.log(modified, 'modified')
              }
            }
        }

        return (
            <div className="term" id={id}>
                {/* {indexNumber && <div className='index-number'>{indexNumber}</div>} */}
                <DisplayNode data={data.childNodes} />
                {bibitemText && <div className="termsource">[SOURCE: <a href={ bibitemid ? `#${bibitemid}` : ''}>{bibitemText}</a>{ modified ? `, ${modified}` : ''}]</div>}
            </div>
        );
    }, [data]);

    return <>{renderContent}</>;
}
