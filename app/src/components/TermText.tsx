// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from 'react';
import { getTerminologies } from '../utility';
import Pluralize from 'pluralize';
import './TermText.css';
import { useXmlData } from '../context';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
    text: string;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function TermText({ text }: OwnProps) {
    const { xml } = useXmlData();
    const terminologies = useMemo(() => {
        return getTerminologies(xml);
        // return [{ text: 'standard', id: 'term-standard' }];
    }, [getTerminologies]);

    const renderContent = useMemo(() => {
        if (text === '\n') return "";
        // split the text by the <>terms</> and return the result
        let termArray: any = {};
        let indexArray: number[] = [];
        if (!text) return;
        terminologies.map((term: any) => {
            if (!term?.text) return;
            let token = text.toLowerCase();
            let depth = 0;
            let start = 0;
            let plural = Pluralize(term.text);
            let position = 0;
            while (token && token.includes(term.text) && depth < 2) {
                depth++;
                position = start + token.indexOf(term.text);
                token = token.substr(position + term.text.length);
                //check the just previous text
                if ([' ', '.', ','].includes(text.charAt(position - 1))) {
                    //check the plural
                    if (
                        text.substr(position, plural.length).toLowerCase() ===
                        plural
                    ) {
                        indexArray.push(position);
                        termArray[position] = {
                            ...term,
                            text: text.substr(position, plural.length)
                        };
                        start = position + plural.length;
                    } else if (
                        [' ', '.', ','].includes(
                            text.charAt(position + term.text.length)
                        )
                    ) {
                        indexArray.push(position);
                        termArray[position] = {
                            ...term,
                            text: text.substr(position, term.text.length)
                        };
                        start = position + term.text.length;
                    }
                }
            }
        });
        if (indexArray.length === 0) return text;
        indexArray = indexArray.sort((first: number, second: number) => first - second);
        let materialArray = [];
        let start = 0;
        indexArray.map((value: number) => {
            if (value !== 0 && start !== text?.length)
                materialArray.push(text.substring(start, value));
            start = value;
            if (termArray[value]) start += termArray[value].text.length;
            materialArray.push(termArray[value]);
        });
        if (start < text.length) materialArray.push(text.substr(start));
        return materialArray.map((material: any, key: number) => {
            if (typeof material === 'string') return material;
            else if (typeof material === 'object' && material?.id)
                return (
                    <a
                        className="terminology"
                        href={`#${material.id}`}
                        key={key}
                    >
                        {material.text}
                    </a>
                );
        });
    }, [text]);

    return <>{renderContent}</>;
}
