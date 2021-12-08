import { DOMParser } from 'xmldom';
import presentationData from './data/document-presentation';

export const getChildsById = (id: string) => {
    const xmlDoc = new DOMParser().parseFromString(
        presentationData,
        'text/xml'
    );
    return xmlDoc.getElementById(id);
};

export const getChildsByTagname = (name: string) => {
    const xmlDoc = new DOMParser().parseFromString(
        presentationData,
        'text/xml'
    );
    return xmlDoc.getElementsByTagName(name);
};

export const getPlainText = (term: string) => {
    if (term) {
        let idText = term.substr(5);
        return idText.split("-").length === 1 ?  idText : "";
    } else {
        return "";
    }
}

export const getTerminologies = () => {
    const tagElements = getChildsByTagname('term');
    if (tagElements) {
        const terms = Object.values(tagElements).map((element: any) => {
            let attrs = element.attributes;
            if (attrs) {
                let idRow: any = Object.values(attrs).find(
                    (attr: any) => attr?.name === 'id'
                );
                if (getPlainText(idRow.value))
                    return {id: idRow?.value, text: getPlainText(idRow?.value)};
                else 
                    return {};
            } else {
                return {};
            }
        });
        return terms.filter((term: any) => term.id);
    } else {
        return [];
    }
};
