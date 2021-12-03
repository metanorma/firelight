// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import SectionTitle from "./SectionTitle";
import SectionP from "./SectionP";
import SectionOl from "./SectionOl";
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
  xmlData: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function ContentSection({ xmlData }: OwnProps) {
  const id = xmlData?.$?.id ? xmlData.$.id : "";

  return id ? (
    <div className="content-section" id={id}>
      {xmlData?.title?.length && <SectionTitle title={xmlData.title[0]} />}
      {xmlData?.p?.length && <SectionP data={xmlData.p} />}
      {xmlData?.ol?.length && <SectionOl data={xmlData.ol[0]} />}
      {xmlData?.clause?.length > 0 &&
        xmlData.clause.map((child: any, index: number) => (
          <ContentSection key={index} xmlData={child} />
        ))}
    </div>
  ) : (
    <>
      {xmlData?.title?.length && <SectionTitle title={xmlData.title[0]} />}
      {xmlData?.p?.length && <SectionP data={xmlData.p} />}
      {xmlData?.ol?.length && <SectionOl data={xmlData.ol[0]} />}
      {xmlData?.clause?.length > 0 &&
        xmlData.clause.map((child: any, index: number) => (
          <ContentSection key={index} xmlData={child} />
        ))}
    </>
  );
}
