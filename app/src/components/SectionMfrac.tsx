// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo, useState } from 'react';
import DisplayNode, { XMLNode } from './DisplayNode';
import './SectionMath.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
    data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionMfrac({ data }: OwnProps) {
    const renderContent = useMemo(() => { console.log(data, 'mfrac')
        const attrs: any[] = data.attributes;
        const idRow = Object.values(attrs).find(
            (attr: any) => attr?.name === 'id'
        );
        const id = idRow?.value ? idRow.value : '';

        return (
            <span className="mfrac" id={id}>
                <span className="mfrac-container">
                    <span className='mfrac1'>
                        <span className="mrow">
                            <span className='msub'>
                                <span className='m-container'>
                                    <span className='m-row1'>
                                        <span className='mrow'>
                                            <span className="mi-1">m</span>
                                        </span>
                                    </span>
                                    <span className='m-row2'>
                                        <span className='mrow'>
                                            <span className='mi-2'>D</span>
                                        </span>
                                    </span>
                                </span>
                            </span>
                        </span>
                    </span>
                    <span className='mfrac2'></span>
                    <span className='mfrac3'></span>
                </span>
            </span>
        );
    }, [data]);

    return <>{renderContent}</>;
}
