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
                let on: any = Object.values(dateRow.childNodes).find(
                    (child: any) => child?.tagName === 'on'
                );
                if (on?.childNodes) {
                    let date = on.childNodes[0].data;
                    if (date) {
                        valueText = `${idText} ( ${
                            date.split('-')[0]
                        } ), ${valueText}`;
                    }
                }
            }
        }
        let formattedText = '';
        if (!valueText) {
            let formattedRef: any = Object.values(childs).find((data: any) => {
                return data?.tagName === 'formattedref';
            });

            if (formattedRef) {
                let emRow: any = Object.values(formattedRef.childNodes).find(
                    (data: any) => data?.tagName === 'em'
                );
                if (formattedRef.childNodes[0].data) {
                    valueText = formattedRef.childNodes[0].data;
                }
                if (emRow) {
                    formattedText = emRow?.childNodes[0].data;
                } else {
                    let linkRow: any = Object.values(
                        formattedRef.childNodes
                    ).find((data: any) => data?.tagName === 'link');
                    if (linkRow?.attributes) {
                        let hrefRow: any = Object.values(
                            linkRow.attributes
                        ).find((data: any) => data?.name === 'target');
                        if (hrefRow) valueText = hrefRow?.value;
                    }
                }
            }
        }

        let uri = '';
        let uriRow: any = Object.values(data.childNodes).find(
            (child: any) => {
                if (child?.tagName === 'uri') {
                    let row = Object.values(child?.attributes).find(
                        (child: any) => child?.name === 'type' && child?.value === 'src'
                    )
                    if (row) return true;
                    return false;
                }
                return false;
            }
        );

        if (uriRow) {
            uri = uriRow?.childNodes[0].data;
        }

        return (
            <div className="bibitem" id={id}>
                <div className="td1">[{idText}]</div>
                <div className="td2">
                    {' '}
                    {formattedText ? formattedText : ''}
                    {valueText && (
                        <>
                            <i className="italic">{valueText}</i>
                        </>
                    )}
                    {uri && <a className="uri" href={uri}>{uri}</a>}
                </div>
            </div>
        );
    }, [data]);

    return <>{renderContent}</>;
}
