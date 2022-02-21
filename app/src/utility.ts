import { DOMParser } from 'xmldom';

export const url =
    'https://github.com/metanorma/bs-l3-ux/files/7626440/document-l3.presentation.xml.zip';

// export const presentationData = () => {
//     const {xml} = useXmlData();
//     return localStorage.getItem('xml') || ' ';
// };

export const getChildsById = (id: string, xml: string) => {
    const xmlDoc = new DOMParser().parseFromString(
        xml,
        'text/xml'
    );
    return xmlDoc.getElementById(id);
};

export const getChildsByTagname = (name: string, xml: string) => {
    const xmlDoc = new DOMParser().parseFromString(
        xml,
        'text/xml'
    );
    return xmlDoc.getElementsByTagName(name);
};

export const getPlainText = (term: string) => {
    if (term) {
        let idText = term.substr(5);
        return idText.split('-').length === 1 ? idText : '';
    } else {
        return '';
    }
};

export const getTerminologies = (xml: string) => {
    const tagElements = getChildsByTagname('term', xml);
    if (tagElements) {
        const terms = Object.values(tagElements).map((element: any) => {
            let attrs = element.attributes;
            if (attrs) {
                let idRow: any = Object.values(attrs).find(
                    (attr: any) => attr?.name === 'id'
                );
                if (getPlainText(idRow.value))
                    return {
                        id: idRow?.value,
                        text: getPlainText(idRow?.value)
                    };
                else return {};
            } else {
                return {};
            }
        });
        return terms.filter((term: any) => term.id);
    } else {
        return [];
    }
};

export const romanize = (num: number) => {
    let lookup: any = {
        M: 1000,
        CM: 900,
        D: 500,
        CD: 400,
        C: 100,
        XC: 90,
        L: 50,
        XL: 40,
        X: 10,
        IX: 9,
        V: 5,
        IV: 4,
        I: 1
    };
    let roman: string = '';
    let i: string = '';
    for (let i in lookup) {
        while (num >= lookup[i]) {
            roman += i;
            num -= lookup[i];
        }
    }
    return roman;
};
