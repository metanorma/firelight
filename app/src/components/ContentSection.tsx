// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { getChildsById } from "../utility";
import DisplayNode from "./DisplayNode";
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
  xmlData: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function ContentSection({ xmlData }: OwnProps) {
  const id = xmlData?.$?.id ? xmlData.$.id : "";
  let node: any = "";
  if (id) {
    node = getChildsById(id);
  }

  return node ? (
    <div className="content-section" id={id}>
      <DisplayNode data={node.childNodes}/>
      {xmlData?.clause?.length > 0 &&
        xmlData.clause.map((child: any, index: number) => (
          <ContentSection key={index} xmlData={child} />
        ))}
    </div>
  ) : (
    <>
      
      {xmlData?.clause?.length > 0 &&
        xmlData.clause.map((child: any, index: number) => (
          <ContentSection key={index} xmlData={child} />
        ))}
    </>
  );
}
