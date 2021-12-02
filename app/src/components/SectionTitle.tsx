// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import { tokenToString } from "typescript";
import "./SectionTitle.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  title: string | any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionTitle({ title }: OwnProps) {
  const renderTitle = useMemo(() => {
    let text = title;
    let depth = "0";
    if (typeof title !== "string") {
      text = title["_"];
      depth = title["$"] ? title["$"]["depth"] : "1";
    }
    const matches: any = text?.match(/[a-zA-Z]+/g);
    const index: number = text?.indexOf(matches[0]);
    let titleString = index
      ? text.substr(0, index) + "  " + text.substr(index)
      : text;
      if (title['strong'] !== undefined && title['strong'].length > 0) {
        titleString = `${title['strong'][0]} ${title["_"]} ${title['strong'][1]}`; 
      }
    switch (depth) {
      case "0":
        return <h1 className="title title-1">{titleString}</h1>;
      case "1":
        return <h2 className="title title-2">{titleString}</h2>;
      case "2":
        return <h3 className="title title-3">{titleString}</h3>;
      default:
        return <h2 className="title title-4">{titleString}</h2>;
    }
  }, [title]);

  return <>{renderTitle}</>;
}
