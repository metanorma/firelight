// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./SectionThead.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionThead({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    const attrs: any = data.attributes;
    const idRow: any = Object.values(attrs).find(
      (attr: any) => attr?.name === "id"
    );
    const id = idRow?.value ? idRow.value : "";
    return <thead className="thead" id={id}><DisplayNode data={data.childNodes} /></thead>
  }, [data]);

  return <>{renderContent}</>;
}
