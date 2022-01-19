// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from 'react';
import { XMLNode } from './DisplayNode';
// import './SectionMath.css';
import MathJSX from 'react-mathjax-preview';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
    data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const makeMathJSX = (data: any) => {
    let mathString = '';
    const attrs = data?.attributes;
    const childNodes = data?.childNodes;
    if (data?.tagName) {
        mathString += `<${data?.tagName}`;
        if (attrs) {
            Object.values(attrs).map((child: any) => {
                if (child?.name) mathString += ` ${child.name}`;
                if (child?.value) mathString += `="${child.value}"`;
            });
        }
        mathString += '>';
        if (childNodes) {
            Object.values(childNodes).map((child: any) => {
                mathString += makeMathJSX(child);
            });
        }
        mathString += `</${data.tagName}>`;
        return mathString;
    } else {
        return data?.data ? data?.data : '';
    }
};

export default function SectionMath({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        const math = makeMathJSX(data);
        return <MathJSX math={math} />;
    }, [data]);

    return <>{renderContent}</>;
}
