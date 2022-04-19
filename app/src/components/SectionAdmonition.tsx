// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./SectionAdmonition.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionAdmonition({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    const attrs: any[] = data.attributes;
    const idRow = Object.values(attrs).find(
      (attr: any) => attr?.name === "id"
    );
    const id = idRow?.value ? idRow.value : "";

    const typeRow = Object.values(attrs).find(
      (attr: any) => attr?.name === "type"
    );
    const type = typeRow?.value ? typeRow.value : "";console.log(data, 'adnomition data')
    return <div className="admonition" id={id}>
      <p className="admonitionTitle">{type ? `${type.toUpperCase()}` : ''}</p>
      <DisplayNode data={data.childNodes} />
    </div>
  }, [data]);

  return <>{renderContent}</>;
}
