// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { getChildsByTagname } from '../utility';
import { XMLNode } from './DisplayNode';
import { useXmlData } from '../context';
import DisplayNode from './DisplayNode';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function CoverIsoStandard() {
    const { xmlJson, xml } = useXmlData();

    const bibdata: XMLNode = getChildsByTagname('bibdata', xml)[0];
    const childs = bibdata.childNodes;

    const mainTitle: any[] = Object.values(childs).filter((child: any) => {
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
            return false;
        }
    });

    const docNumberRow: XMLNode | any = Object.values(childs).find(
        (child: any) => child.tagName === 'docnumber'
    );

    let docNum = '';
    if (docNumberRow && docNumberRow?.childNodes) {
        docNum = docNumberRow?.childNodes[0].data;
    }

    const versionRow: any = Object.values(childs).find(
        (child: any) => child?.tagName === 'version'
    );

    let versionDate = '';
    if (versionRow && versionRow?.childNodes) {
        const versionDateRow: any = Object.values(versionRow.childNodes).find(
            (child: any) => child?.tagName === 'revision-date'
        );

        if (versionDateRow && versionDateRow?.childNodes) {
            versionDate = versionDateRow.childNodes[0]?.data;
        }
    }

    let technical = '';
    let sc = '';
    let wg = '';
    let secretariat = '';
    let ics = '';
    const extRow: any = Object.values(childs).find(
        (child: any) => child?.tagName === 'ext'
    );

    if (extRow && extRow?.childNodes) {
        const editorGroup: any = Object.values(extRow.childNodes).find(
            (child: any) => child?.tagName === 'editorialgroup'
        );

        if (editorGroup && editorGroup?.childNodes) {
            const technicalRow: any = Object.values(
                editorGroup.childNodes
            ).find((child: any) => child?.tagName === 'technical-committee');

            if (technicalRow && technicalRow?.attributes) {
                const attr: any = Object.values(technicalRow?.attributes).find(
                    (child: any) => child?.nodeName === 'number'
                );

                if (attr) {
                    technical = attr?.value;
                }
            }

            const scRow: any = Object.values(editorGroup.childNodes).find(
                (child: any) => child?.tagName === 'sc-committee'
            );

            if (scRow && scRow?.attributes) {
                const attr: any = Object.values(scRow?.attributes).find(
                    (child: any) => child?.nodeName === 'subcommittee'
                );

                if (attr) {
                    sc = attr?.value;
                }
            }

            const wgRow: any = Object.values(editorGroup.childNodes).find(
                (child: any) => child?.tagName === 'workgroup'
            );

            if (wgRow && wgRow?.attributes) {
                const attr: any = Object.values(wgRow?.attributes).find(
                    (child: any) => child?.nodeName === 'number'
                );

                if (attr) {
                    wg = attr?.value;
                }
            }

            const secretariatRow: any = Object.values(
                editorGroup.childNodes
            ).find((child: any) => child?.tagName === 'secretariat');

            if (secretariatRow && secretariatRow?.childNodes) {
                secretariat = secretariatRow?.childNodes[0]?.data;
                console.log(secretariat, 'secre');
            }
        }

        const icsRow: XMLNode | any = Object.values(extRow.childNodes).find(
            (child: any) => child?.tagName === 'ics'
        );

        if (icsRow && icsRow?.childNodes) {
            const codeRow: any = Object.values(icsRow.childNodes).find(
                (child: any) => child?.tagName === 'code'
            );
            if (codeRow && codeRow?.childNodes) {
                ics = codeRow.childNodes[0]?.data;
            }
        }
    }

    let isoTc = technical ? technical : '';
    isoTc = (isoTc ? isoTc + '/' : '') + (sc ? 'SC ' + sc : '');
    isoTc = (isoTc ? isoTc + '/' : '') + (wg ? 'WG ' + wg : '');
    isoTc = 'ISO/TC ' + isoTc;

    //copyright part
    let title = '';
    let node: any = {};
    const copyRightContent = getChildsByTagname('copyright-statement', xml);

    if (copyRightContent && copyRightContent[0]?.childNodes) {
        let data: any = Object.values(copyRightContent[0].childNodes).find(
            (child: any) => child?.tagName === 'clause'
        );

        if (data?.childNodes) {
            Object.values(data.childNodes).map((child: any, index: number) => {
                if (child?.tagName === 'title') {
                    title = child?.childNodes[0]?.data;
                    delete data.childNodes[index];
                }
            });
            node = data.childNodes;
        }
    }

    return (
        <div className="cover">
            {docNum && <p className="coverpage_docnumber">{docNum}</p>}
            {versionDate && (
                <p className="coverpage_docnumber">Date: {versionDate}</p>
            )}
            <p className="coverpage_docnumber">ISO/PWI 17301-1(E)</p>
            {isoTc && <p className="coverpage_docnumber">{isoTc}</p>}
            {secretariat && (
                <p className="coverpage_docnumber">
                    Secretariat: {secretariat}
                </p>
            )}
            {mainTitle?.length &&
                Object.values(mainTitle).map((child: any) => (
                    <h1 className="main-title">{child?.childNodes[0]?.data}</h1>
                ))}
            {ics && (
                <p className="doc-ics">
                    <b>ICS:</b> {ics}
                </p>
            )}
            <div className="content-section">
                {title && <h1 className="title title-3">{title}</h1>}
                {node && <DisplayNode data={node} />}
            </div>
        </div>
    );
}
