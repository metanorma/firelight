// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./SectionTfoot.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionTfoot({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    const attrs: any[] = data.attributes;
    const idRow = Object.values(attrs).find(
      (attr: any) => attr?.name === "id"
    );
    const id = idRow?.value ? idRow.value : "";
    return <tfoot className="tfoot" id={id}><DisplayNode data={data.childNodes} /></tfoot>
  }, [data]);

  return <>{renderContent}</>;
}
