// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./SectionTd.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: any | XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionTd({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    console.log(data, 'tddata');
    const attrs: any = data.attributes;
    const props: any = {};
    const valignRow = Object.values(attrs).map(
      (attr: any) => {
        if (attr?.name) {
          props[attr.name] = attr.value;
        }
      }
    );
    return <td className="td" {...props}><DisplayNode data={data.childNodes} /></td>
  }, [data]);

  return <>{renderContent}</>;
}
