// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { getChildsByTagname } from '../utility';
import { XMLNode } from './DisplayNode';
import { useXmlData } from '../context';
import './Cover.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function Cover() {
    const { xmlJson } = useXmlData();

    if (xmlJson['iso-standard']) {
        console.log(xmlJson['iso-standard'], 'iso')
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
                <p className="doc-identifier">
                    {docIdentifier?.childNodes[0].data}
                </p>
                <h1 className="main-title">{mainTitle?.childNodes[0].data}</h1>
            </div>
        );
    } else if (xmlJson['itu-standard']) {
        console.log(xmlJson['itu-standard'], 'itu')
        if (xmlJson['itu-standard']['bibdata']) {
            const bibdata = xmlJson['itu-standard']['bibdata'][0];
            let author = '';
            let ext = '';
            let doctype = '';
            let bureau = '';
            let docNumber = '';
            let publishedDate = '';
            let title = '';
            let keywords = '';
console.log(bibdata, 'bibdata', typeof bibdata.contributor)
            if (bibdata?.contributor) {
                let authorRow = bibdata.contributor.find(
                    (child: any) => {
                        if (!child?.role) return false;
                        let roleRow = child.role.map(
                            (child: any) => child?.$?.type === 'author'
                        );
                        return !!roleRow;
                    }
                );
                author = authorRow?.organization[0]['name'][0];
            }

            if (bibdata?.ext) {
                let extRow: any = bibdata.ext[0];
                doctype = extRow?.doctype[0];
                let structuredIdetifier = extRow?.structuredidentifier[0]; 
                if (structuredIdetifier?.bureau) {
                    bureau = structuredIdetifier?.bureau[0].toUpperCase();
                    ext = 'ITU-' + structuredIdetifier?.bureau[0].toUpperCase();
                }
                if (doctype) ext += ' ' + doctype.toUpperCase();
                if (structuredIdetifier?.docnumber) {
                    docNumber = structuredIdetifier.docnumber[0];
                    ext += ' ' + structuredIdetifier.docnumber[0];
                }
                console.log(ext, 'ext')
            }

            if (bibdata?.date) {
                let dateRow = bibdata.date[0];
                console.log(dateRow, 'dateRow')
                if (dateRow) {
                    let dates = dateRow.on[0].split('-');
                    publishedDate = dates[1] + '/' + dates[0];
                    console.log(publishedDate, 'date')
                }
            }

            if (bibdata?.title) {
                let titleRow = bibdata.title.find(
                    (child: any) => child?.$?.type === 'main'
                );
                
                if (titleRow?._) {
                    title = titleRow._;
                    console.log(title, 'title')
                }
            }

            if (bibdata?.keyword) {
                keywords = bibdata.keyword.join(' ');
                console.log(keywords, 'keywords')
            }

            
            
        }
    }
        
    return (<header>ITU-Standard</header>);
    

}
