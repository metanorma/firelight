// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import SectionTitle from "./SectionTitle";
import SectionP from "./SectionP";
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
  xmlData: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function ContentSection({ xmlData }: OwnProps) {
  const id = xmlData["$"]["id"] ? xmlData["$"]["id"] : "";

  return (
    <div className="content-section" id={id}>
      {xmlData?.title?.length && <SectionTitle title={xmlData.title[0]} />}
      {xmlData?.p?.length && <SectionP data={xmlData.p} />}
      {xmlData?.clause?.length > 0 &&
        xmlData.clause.map((child: any) => <ContentSection xmlData={child} />)}
    </div>
  );
}
