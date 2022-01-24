// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from 'react';
import DisplayNode, { XMLNode } from './DisplayNode';
import './SectionFigure.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
    data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionFigure({ data }: OwnProps) {
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
                    index =
                        'Figure ' +
                        id.substring(4).substring(0, 1).toUpperCase() +
                        id.substring(4).substring(1).toUpperCase();
                } else {
                    index = 'Figure ' + id.substring(3);
                }
                if (index) name = index + ' — ' + name;
            }
            let imageRow: any = Object.values(data.childNodes).find(
                (child: any) => child?.tagName === 'image'
            );

            return (<div id={id} className='figure'>
              {name && <span className='name'>{name ? name: ''}</span>}
              {imageRow && <DisplayNode data={[imageRow]} />}
            </div>);
        }

        return (
            <div id={id} className="figure">
                <DisplayNode data={data.childNodes} />
            </div>
        );
    }, [data]);

    return <>{renderContent}</>;
}
