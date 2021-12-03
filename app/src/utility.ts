import { DOMParser } from 'xmldom';
import presentationData from "./data/document-presentation";

export const getChildsById = (id: string) => {
    const xmlDoc = new DOMParser().parseFromString(presentationData,
        'text/xml'
    );
    return xmlDoc.getElementById(id);
}