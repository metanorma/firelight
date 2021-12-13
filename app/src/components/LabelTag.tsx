// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./LabelTag.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: any | XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function LabelTag({ data }: OwnProps) {
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
    return <label className="td" {...props}><DisplayNode data={data.childNodes} /></label>
  }, [data]);

  return <>{renderContent}</>;
}
