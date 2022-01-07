// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./SectionBibitem.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionReference({ data }: OwnProps) {
  const renderContent = useMemo(() => { 
    console.log(data, 'bibitem');
    const attrs: any = data.attributes;
    const idRow: any = Object.values(attrs).find(
      (attr: any) => attr?.name === "id"
    );
    const id = idRow?.value ? idRow.value : "";

    const childs = data.childNodes;

    let docidentifier: any = Object.values(childs).find(
      (child: any) => child?.tagName === "docidentifier"
    ) 
    let idText = docidentifier?.childNodes[0].data;
    console.log(idText, 'idText');
    let titleChild: any = Object.values(childs).find(
      (child: any) => {
        if (child?.tagName !== 'title') return false;
        let attr = child.attributes;
        let main = Object.values(attr).find(
          (child: any) => child?.nodeName === 'type' && child?.value === 'main'
        )
        if (main) return true;
      }
    ) 
    let valueText = '';
    if (titleChild) {
      valueText = titleChild?.childNodes[0].data;
    }  

    return <div className="bibitem" id={id}>{idText}{valueText && <>, <i className="italic">{valueText}</i></>}</div>
  }, [data]);

  return <>{renderContent}</>;
}
