// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from 'react';
import { getTerminologies } from '../utility';
import './TermText.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
    text: string;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function TermText({ text }: OwnProps) {
    const terminologies = useMemo(() => {
        return getTerminologies();
        // return [{ text: 'standard', id: 'term-standard' }];
    }, [getTerminologies]);

    const renderContent = useMemo(() => {
        // split the text by the <>terms</> and return the result
        let termArray: any = {};
        let indexArray: number[] = [];
        terminologies.map((term: any) => {
            if (!term?.text) return;
            let token = text;
            let depth = 0;
            let start = 0;
            while (token && token.includes(term.text) && depth < 2) {
                depth++;
                indexArray.push(start + token.indexOf(term.text));
                termArray[token.indexOf(term.text)] = term;
                start = token.indexOf(term.text) + term.text.length;
                token = token.substr(start);
            }
        });
        if (indexArray.length === 0) return text;
        indexArray = indexArray.sort();
        let materialArray = [];
        if (indexArray.length >= 2) console.log(indexArray)
        let start = 0;
        indexArray.map((value: number) => {
            if (value !== 0 && start !== text?.length) materialArray.push(text.substring(start, value));
            materialArray.push(termArray[value]);
            start = value;
            if (termArray[value]) start += termArray[value].text.length;
        })
        if (start < text.length) materialArray.push(text.substr(start));
        // if (indexArray.length >= 2) console.log(materialArray,'mate', text, start);
        return materialArray.map((material: any, key: number) =>{
            if (typeof material === 'string') return material;
            else if (typeof material === 'object' && material?.id )return <a className='terminology' href={`#${material.id}`} key={key}>{material.text}</a>
        })
    }, [text]);

    return <>{renderContent}</>;
}
