// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from 'react';
import DisplayNode, { XMLNode } from './DisplayNode';
import './SectionBibitem.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
    data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionReference({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        const attrs: any = data.attributes;
        const idRow: any = Object.values(attrs).find(
            (attr: any) => attr?.name === 'id'
        );
        const id = idRow?.value ? idRow.value : '';

        const childs = data.childNodes;

        let docidentifier: any = Object.values(childs).find(
            (child: any) => child?.tagName === 'docidentifier'
        );
        let idText = docidentifier?.childNodes[0].data;

        let titleChild: any = Object.values(childs).find((child: any) => {
            if (child?.tagName !== 'title') return false;
            let attr = child.attributes;
            let main = Object.values(attr).find(
                (child: any) =>
                    child?.nodeName === 'type' && child?.value === 'main'
            );
            if (main) return true;
        });
        let valueText = '';
        if (titleChild) {
            valueText = titleChild?.childNodes[0].data;
        }

        if (!valueText) {
            let titleChild: any = Object.values(childs).find((child: any) => {
                if (child?.tagName === 'title') return true;
            });

            if (titleChild) {
              valueText = titleChild?.childNodes[0].data;
            }

            let dateRow: any = Object.values(childs).find((child: any) => {
                if (child?.tagName === 'date') return true;
            });

            if (dateRow?.childNodes) {
              let on: any = Object.values(dateRow.childNodes).find((child: any) => child?.tagName === 'on')
              if (on?.childNodes) {
                let date = on.childNodes[0].data;
                if (date) {
                  valueText = `${idText} ( ${date.split("-")[0]} ), ${valueText}`;
                }
              }
            }
        }

        if(!valueText) {
          console.log(data, 'other')
        }

        return (
            <div className="bibitem" id={id}>
                [{idText}]
                {valueText && (
                    <>
                        <i className="italic">{valueText}</i>
                    </>
                )}
            </div>
        );
    }, [data]);

    return <>{renderContent}</>;
}
