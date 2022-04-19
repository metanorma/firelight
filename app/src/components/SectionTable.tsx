// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from 'react';
import DisplayNode, { XMLNode } from './DisplayNode';
import './SectionTable.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
    data: any | XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionTable({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        const attrs: any[] = data.attributes;
        const idRow = Object.values(attrs).find(
            (attr: any) => attr?.name === 'id'
        );
        const id = idRow?.value ? idRow.value : '';

        if (id?.toLowerCase().includes('fig')) {
            let name = '';
            let nameRow: any = Object.values(data.childNodes).find(
                (child: any) => child?.tagName === 'name'
            );
            if (nameRow) {
                name = nameRow.childNodes[0].data;
                let index = '';
                if (isNaN(parseInt(id.substring(3)))) {
                    if (!id.substring(4).includes('-'))
                        index =
                            'Figure ' +
                            id.substring(4).substring(0, 1).toUpperCase() +
                            id.substring(4).substring(1).toUpperCase();
                    else {
                        let figure = localStorage.getItem('figure');
                        let figureId = localStorage.getItem('id');
                        if (figure) index = parseInt(figure).toString();
                        else index = '1';
                        if (id !== figureId) {
                            localStorage.setItem(
                                'figure',
                                (parseInt(index) + 1).toString()
                            );
                            localStorage.setItem('figure', id.substring(3));
                            localStorage.setItem('id', id);
                        }
                    }
                } else {
                    index = 'Figure ' + id.substring(3);
                }
                if (index) name = index + ' — ' + name;
            }

            let nodes = Object.values(data?.childNodes).filter(
                (child: any, index: number) => child?.tagName !== 'name'
            );
            return (
                <table className="table" id={id}>
                    <DisplayNode data={nodes} />
                    {name && <div className="name">{name ? name : ''}</div>}
                </table>
            );
        }

        if (id?.toLowerCase().includes('table')) {
            let name = '';
            let nameRow: any = Object.values(data.childNodes).find(
                (child: any) => child?.tagName === 'name'
            );
            if (nameRow) {
                name = nameRow.childNodes[0].data;
                let index = '';
                if (isNaN(parseInt(id.substring(3)))) {
                    index =
                        'Table ' +
                        id.substring(5).substring(0, 1).toUpperCase() +
                        id.substring(5).substring(1).toUpperCase();
                } else {
                    index = 'Table ' + id.substring(5);
                }
                if (index) name = index + ' — ' + name;
            }

            let nodes = Object.values(data?.childNodes).filter(
                (child: any, index: number) => child?.tagName !== 'name'
            );
            return (
                <table className="table" id={id}>
                    {name && <div className="name">{name ? name : ''}</div>}
                    <DisplayNode data={nodes} />
                </table>
            );
        }

        return (
            <table className="table" id={id}>
                <DisplayNode data={data.childNodes} />
            </table>
        );
    }, [data]);

    return <>{renderContent}</>;
}
