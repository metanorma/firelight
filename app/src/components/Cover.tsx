// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { getChildsByTagname } from '../utility';
import { XMLNode } from './DisplayNode';
import './Cover.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
    data: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function Cover() {
    const bibdata: XMLNode = getChildsByTagname('bibdata')[0];
    const childs = bibdata.childNodes;

    const mainTitle: XMLNode | any = Object.values(childs).find(
        (child: any) => {
            if (child.tagName === 'title') {
                let attrs = child.attributes;
                let result = false;
                Object.values(attrs).map((attr: any) => {
                    if (attr.name === 'type' && attr.value === 'main') {
                        result = true;
                    }
                });
                return result;
            } else {
                return;
            }
        }
    );

    const docIdentifier: XMLNode | any = Object.values(childs).find(
        (child: any) => child.tagName === 'docidentifier'
    );

    const copyRight: XMLNode | any = Object.values(childs).find(
        (child: any) => child.tagName === 'copyright'
    );

    return (
        <div className="cover">
            <p className="doc-identifier">{docIdentifier?.childNodes[0].data}</p>
            <h1 className="main-title">{mainTitle?.childNodes[0].data}</h1>
        </div>
    );
}
