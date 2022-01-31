// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./SectionThead.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionTbody({ data }: OwnProps) {

  const findFnTags = (tbodyData: XMLNode ) => {
    let queue: any[] = [];
    let result: any[] = [];
    let count = 0;

    queue.push(tbodyData);

    while(queue.length > 0 && count < 1000) {
      let tagData = queue.shift();
      if (tagData?.tagName === 'fn') {
        result.push(tagData);
      }
      if (tagData?.childNodes) {
        Object.values(tagData.childNodes).map(
          (child: any) => queue.push(child)
        )
      }
      count ++;
    }

    return result;
  }

  const renderContent = useMemo(() => {
    const attrs: any[] = data.attributes;
    const idRow = Object.values(attrs).find(
      (attr: any) => attr?.name === "id"
    );
    const id = idRow?.value ? idRow.value : "";
    //seek for fn tags
    let fns: any[] = findFnTags(data);

    return <tbody className="tbody" id={id}>
      <DisplayNode data={data.childNodes} />
      {fns?.length && fns.map((child: any, index: number) => 
        <tr className="table-reference">
          <td colSpan={10}><DisplayNode data={child.childNodes}/></td>          
        </tr>       
      )}
      </tbody>
  }, [data]);

  return <>{renderContent}</>;
}
