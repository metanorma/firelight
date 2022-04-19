// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./SectionUl.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: string | XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionBib({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    if (typeof data === "string") return <ol>{data}</ol>;
    const attrs: any[] = data.attributes;
    let dataRow = Object.values(attrs).find((attr: any) => attr?.name === "id");
    const id = dataRow?.value ? dataRow.value : "";
    // dataRow = Object.values(attrs).find((attr: any) => attr?.name === "type");
    // const type: any = dataRow?.value === "alphabet" ? "A" : "1";
    return (
      <ul className="ul">
        {Object.values(data.childNodes).length > 0 &&
          Object.values(data.childNodes).map(
            (item: any, index: number) =>
              item.tagName === "li" && (
                <li key={index}>
                  <DisplayNode data={item.childNodes} />
                </li>
              )
          )}
      </ul>
    );
  }, [data]);

  return <>{renderContent}</>;
}
