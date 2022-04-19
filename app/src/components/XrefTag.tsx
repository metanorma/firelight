// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./XrefTag.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function XrefTag({ data }: OwnProps) {
  const makeFirstLetterToUpperCase = (word: string) => {
    let string = '';
    if (word.toLocaleLowerCase().includes('fig') && !word.toLocaleLowerCase().includes('figure')) {
      if (Number.isInteger(parseInt(word.substring(3)))) {
        string = 'Figure ' + word.substring(3);
      } else {
        string = 'Figure ' + word.substring(4).substring(0,1).toUpperCase() + word.substring(4).substring(1);
      }
    } 
    return string ? string : word.substring(0,1).toLocaleUpperCase() + word.substring(1);
  }

  const renderContent = useMemo(() => {   

    const attrs: any[] = data.attributes;
    const xrefRow = Object.values(attrs).find(
      (attr: any) => attr?.name === "target"
    );
    const attr: any = {};
    attr.href = `#${xrefRow.value}`;
    return <a className="xref" {...attr}>{makeFirstLetterToUpperCase(attr.href.substr(1))}</a>
  }, [data]);

  return <>{renderContent}</>;
}
