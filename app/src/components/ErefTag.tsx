// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./ErefTag.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function ErefTag({ data }: OwnProps) {
  const renderContent = useMemo(() => {   
    
    const attrs: any[] = data.attributes;
    const biditemid = Object.values(attrs).find(
      (attr: any) => attr?.name === "bibitemid"
    );

    const citeas = Object.values(attrs).find(
      (attr: any) => attr?.name === "citeas"
    );
    
    let value = '';
    if (data?.childNodes && data?.childNodes[0]) {
      value = data.childNodes[0].data;
      if (!value) {
        value = data.childNodes[0].childNodes[0].childNodes[0].childNodes[0].data;
        value = citeas.value + ', Clause ' + value;
      }
    }
    if (biditemid.value === 'ISO16634') console.log(data, 'eref data', value)
    return <a className="eref" href={`#${biditemid.value}`}>{value ? value : citeas.value}</a>
  }, [data]);

  return <>{renderContent}</>;
}
