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
