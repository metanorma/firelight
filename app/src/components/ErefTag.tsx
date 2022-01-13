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

    const attrs: any[] = data.attributes; console.log(attrs, 'attrs')
    const biditemid = Object.values(attrs).find(
      (attr: any) => attr?.name === "bibitemid"
    );

    const citeas = Object.values(attrs).find(
      (attr: any) => attr?.name === "citeas"
    );
    console.log(biditemid, 'biditem')
    return <a className="eref" href={`#${biditemid.value}`}>{citeas.value}</a>
  }, [data]);

  return <>{renderContent}</>;
}
