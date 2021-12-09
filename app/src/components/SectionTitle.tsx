// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./SectionTitle.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  title: string | XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionTitle({ title }: OwnProps) {
  const renderTitle = useMemo(() => {
    if (typeof title === "string") {
      return <h3 className="title title-3">{title}</h3>;
    }
    const attrs: any[] = title.attributes;
    const depthRow = Object.values(attrs).find(
      (attr: any) => attr?.name === "depth"
    );
    let depth = depthRow?.value ? depthRow.value : "2";
    if (title.childNodes[0].data === 'Foreword') depth = "0";

    switch (depth) {
      case "0":
        return (
          <h1 className="title title-1">
            <DisplayNode data={title.childNodes} />
          </h1>
        );
      case "1":
        return (
          <h2 className="title title-2">
            <DisplayNode data={title.childNodes} />
          </h2>
        );
      case "2":
        return (
          <h3 className="title title-3">
            <DisplayNode data={title.childNodes} />
          </h3>
        );
      default:
        return (
          <h2 className="title title-4">
            <DisplayNode data={title.childNodes} />
          </h2>
        );
    }
  }, [title]);

  return <>{renderTitle}</>;
}
