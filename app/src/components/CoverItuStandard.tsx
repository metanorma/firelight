// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useXmlData } from '../context';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function CoverItuStandard() {
    const { xmlJson, xml } = useXmlData();

    let author = '';
    let ext = '';
    let doctype = '';
    let bureau = '';
    let docNumber = '';
    let publishedDate = '';
    let title = '';
    let keywords = '';

    let copyRightMark = '';
    let copyRightText = '';

    if (xmlJson['itu-standard']['bibdata']) {
        const bibdata = xmlJson['itu-standard']['bibdata'][0];

        if (bibdata?.contributor) {
            let authorRow = bibdata.contributor.find((child: any) => {
                if (!child?.role) return false;
                let roleRow = child.role.map(
                    (child: any) => child?.$?.type === 'author'
                );
                return !!roleRow;
            });
            author = authorRow?.organization[0]['name'][0];
        }

        if (bibdata?.ext) {
            let extRow: any = bibdata.ext[0];
            doctype = extRow?.doctype[0].replace('-', ' ').toUpperCase();
            let structuredIdetifier = extRow?.structuredidentifier[0];
            if (structuredIdetifier?.bureau) {
                bureau = structuredIdetifier?.bureau[0].toUpperCase();
                ext = 'ITU-' + structuredIdetifier?.bureau[0].toUpperCase();
            }
            if (doctype) ext += ' ' + doctype.toUpperCase();
            if (structuredIdetifier?.docnumber) {
                docNumber = structuredIdetifier.docnumber[0];
                ext += ' ' + structuredIdetifier.docnumber[0];
            }
        }

        if (bibdata?.date) {
            let dateRow = bibdata.date[0];
            if (dateRow) {
                let dates = dateRow.on[0].split('-');
                publishedDate = '(' + dates[1] + '/' + dates[0] + ')';
            }
        }

        let cover = '';
        if (bibdata?.cover) {
            let coverRow: any = bibdata.cover.find((child: any) => {
                return child.tagName === 'cover';
            });

            cover = coverRow.data[0];
        }

        if (bibdata?.title) {
            let titleRow = bibdata.title.find(
                (child: any) => child?.$?.type === 'main'
            );

            if (titleRow?._) {
                title = titleRow._;
            }
        }

        if (bibdata?.keyword) {
            keywords = bibdata.keyword.join(' ');
        }
    }

    if (xmlJson['itu-standard']['boilerplate']) {
        const boilerPlate = xmlJson['itu-standard']['boilerplate'][0];

        if (boilerPlate['copyright-statement']) {
            const copyRight = boilerPlate['copyright-statement'][0];

            if (copyRight?.clause) {
                const clause = copyRight.clause[0];

                if (clause) {
                    const data = clause.p;

                    if (data[0]) copyRightMark = data[0]._;
                    if (data[1]) copyRightText = data[1]._;
                }
            }
        }
    }

    return (
        <header className="cover" id="cover">
            <div className="coverpage">
                <div className="wrapper-top">
                    <div className="coverpage-doc-identity">
                        <div className="doc-type">{author}</div>
                        <div className="ITU-sector">{`ITU-${bureau}`}</div>
                        <div className="doc-info-left">
                            <div className="doc-identifier">{`${doctype} ${docNumber}`}</div>
                            <div className="publication-month">
                                {publishedDate}
                            </div>
                        </div>
                        <div className="doc-category">
                            Telecommunication <br />
                            Standardization Sector <br />
                            of ITU
                        </div>
                        <div className="coverpage-title">
                            <span className="doc-title">{title}</span>
                        </div>
                    </div>
                    <div className="doc-footer">
                        <div className="keywords">
                            <b>Keywords</b>: {keywords}
                        </div>
                        <div>
                            <span className="doc-type">{doctype}</span>
                            <span className="ITU-sector">{`ITU-${bureau}`}</span>
                            <span className="doc-identifier">{docNumber}</span>
                        </div>
                    </div>
                    <div className="logo-wrapper">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            id="ITU-logo"
                            data-name="Layer 1"
                            width="272"
                            height="300"
                            viewBox="0 0 272 300"
                        >
                            <defs></defs>
                            <title>ITU</title>
                            <path
                                className="cls-1"
                                d="M53.95176,124.04334a1.39913,1.39913,0,0,1,1.40068,1.40094v84.80738a1.404,1.404,0,0,1-1.40068,1.40666H28.56261a1.40764,1.40764,0,0,1-1.40068-1.40666V125.44428a1.40272,1.40272,0,0,1,1.40068-1.40094H53.95176"
                            ></path>
                            <path
                                className="cls-1"
                                d="M145.67105,124.04334a1.39914,1.39914,0,0,1,1.40068,1.40094V146.326a1.404,1.404,0,0,1-1.40068,1.40668H123.50867a1.404,1.404,0,0,0-1.40663,1.40092v61.118a1.4041,1.4041,0,0,1-1.401,1.40666H95.31221a1.404,1.404,0,0,1-1.40068-1.40666v-61.118a1.40277,1.40277,0,0,0-1.401-1.40092H70.85941a1.4089,1.4089,0,0,1-1.40664-1.40668V125.44428a1.404,1.404,0,0,1,1.40664-1.40094h74.81164"
                            ></path>
                            <path
                                className="cls-1"
                                d="M244.46942,124.04334a1.40422,1.40422,0,0,1,1.40663,1.40094v43.22185c0,28.627-15.0027,43.76154-43.38279,43.76154-27.4157,0-41.31559-14.93933-41.31559-44.4046V125.44428a1.39921,1.39921,0,0,1,1.401-1.40094h25.38284a1.40043,1.40043,0,0,1,1.40664,1.40094v42.441c0,9.33564,2.45758,20.46263,14.1585,20.46263,9.5251,0,14.1529-6.69457,14.1529-20.46263v-42.441a1.404,1.404,0,0,1,1.40664-1.40094h25.3832"
                            ></path>
                            <path
                                className="cls-1"
                                d="M271.12012,299c-16.84562-8.30792-35.804-17.7871-53.2867-28.20789q4.4696-3.46207,8.635-7.28018A133.03915,133.03915,0,0,0,247.28128,89.2695a134.47457,134.47457,0,0,0-183.33695-38.91C53.0126,35.11588,42.035,18.58043,30.43146,1,34.083,8.41225,44.91131,31.26336,57.60572,54.60822A135.0389,135.0389,0,0,0,.87988,164.51161,132.39673,132.39673,0,0,0,14.19454,222.5522,134.51424,134.51424,0,0,0,209.97884,276.436c20.48556,8.47442,41.07449,15.55367,61.14128,22.564M122.93256,287.31035a124.4229,124.4229,0,0,1-79.12931-39.63342,33.60229,33.60229,0,0,1-5.5575-15.96706,175.63893,175.63893,0,0,0,46.236,31.6298,187.00148,187.00148,0,0,0,59.79738,17.44261c-6.9757,4.87453-14.19285,7.13093-21.34657,6.52807M35.2888,220.36472c-.12055,1.24016-.19519,2.4516-.24705,3.65157-1.11368-1.21145-2.21053-2.42291-3.25517-3.65157H27.79026c2.23365,2.74441,4.65654,5.44865,7.22871,8.107a45.77546,45.77546,0,0,0,1.52718,10.55285A122.68891,122.68891,0,0,1,31.91274,96.4923a67.04283,67.04283,0,0,0-1.91757,18.82631H32.998a60.01641,60.01641,0,0,1,4.93163-27.09979A124.9733,124.9733,0,0,1,54.3905,71.115q4.70245-2.64395,9.6516-4.9262c7.3377,12.87816,14.97957,25.13044,22.00714,34.18475a148.36379,148.36379,0,0,1-23.71234-.49375l1.28609.36171c-.40756-.03445-.8095-.07464-1.223-.11483,2.50313,5.2075,5.24211,10.26575,8.14719,15.192h51.174q-4.01332-3.28127-7.90049-6.80366A214.83757,214.83757,0,0,1,150.4569,84.37778a53.34945,53.34945,0,0,0,15.33,11.7241,55.86873,55.86873,0,0,0,23.69482,6.4649c.90166,4.13961,1.67681,8.39979,2.31986,12.75183h3.05436q-.94722-6.53667-2.29077-12.77481c7.64748-.32152,14.16411-2.77312,18.07423-7.25146a134.07139,134.07139,0,0,1,17.02329,20.02627h3.6459A136.97749,136.97749,0,0,0,212.41925,92.812a16.79184,16.79184,0,0,0,1.36633-12.93552,28.74433,28.74433,0,0,0-4.31767-8.95674,30.75992,30.75992,0,0,1,14.968,7.02761,122.772,122.772,0,0,1,27.39258,131.0722c-10.52418,21.89225-35.98762,33.78285-67.28436,34.65556,13.21689-3.34152,23.74668-7.92323,36.22872-15.82926-4.66776-2.14155-9.35268-4.48408-14.038-6.98737-1.44658.07464-2.91069.12057-4.4207.12057-26.07215,0-42.30907-11.483-47.59113-34.18476-8.18749-6.27545-16.18541-12.815-23.91909-19.48085V186.312c10.95486,9.9787,21.89219,19.14211,32.10623,27.5878-7.85984,5.23625-33.30611,12.96428-38.29,13.837q6.425,5.14149,13.00454,9.78347a193.15732,193.15732,0,0,1-31.4229-11.83893q-1.50755-.72342-2.99724-1.46982c-.14333-.06891-.2814-.13779-.41912-.20669q-2.79014-1.40381-5.506-2.87648a142.74922,142.74922,0,0,1-33.249-24.631v4.21425q4.43541,4.2975,9.41015,8.2907a161.36744,161.36744,0,0,0,33.77149,20.4741,193.87776,193.87776,0,0,0,37.5954,13.00445q10.4809,6.97591,21.226,12.9413c-.08025.14355-.16646.29281-.25267.4421-5.52876,9.37583-11.54042,16.78233-17.79283,22.05875-19.77944-1.72244-41.33837-7.50411-62.26618-17.5115-18.82626-9.00265-35.19529-20.5832-47.72885-33.30632a59.25825,59.25825,0,0,1,.32135-6.74049ZM143.4006,71.93026a29.50071,29.50071,0,0,0,5.09283,10.05906,219.33257,219.33257,0,0,0-36.93484,24.46443c-13.62445-12.64847-26.25017-27.427-38.72625-43.98547.06869-.023.13211-.05738.2008-.08038.01156-.00574.02873-.01147.0403-.01721v.00574A109.521,109.521,0,0,1,90.648,57.42727a126.6736,126.6736,0,0,1,54.11372,1.57318,16.75412,16.75412,0,0,0-1.36108,12.92981m2.917-.77512a13.70221,13.70221,0,0,1,1.3835-11.18439c.0403-.06316.09182-.12059.13212-.18371a143.44783,143.44783,0,0,1,28.32857,10.93177q-2.86792.82678-5.82768,1.83727a157.61385,157.61385,0,0,0-19.06175,8.03234,26.81162,26.81162,0,0,1-4.95476-9.43328m31.05564-3.198A147.18752,147.18752,0,0,0,150.02657,57.255c3.72019-3.37024,9.47919-5.08123,16.14476-5.0927a69.51757,69.51757,0,0,1,11.20191,15.7948m-6.7693-15.5594a54.77565,54.77565,0,0,1,19.40027,5.9941,52.42951,52.42951,0,0,1,12.06888,8.58352,78.61407,78.61407,0,0,0-20.57772,2.34825,79.14234,79.14234,0,0,0-10.89143-16.92587m.70612,23.01761c2.90508-.9933,5.73587-1.83728,8.50884-2.555q1.83451,3.953,3.47944,8.34234a152.17933,152.17933,0,0,1,5.50038,18.37848,53.66044,53.66044,0,0,1-21.61675-6.1606,50.91755,50.91755,0,0,1-13.90024-10.461,154.40473,154.40473,0,0,1,18.02833-7.54427m14.81872,4.731q-.973-2.60091-2.01533-5.05249a142.63376,142.63376,0,0,1,24.3326,18.12584c-3.45071,4.07645-9.43328,6.2295-16.52988,6.40748a157.66347,157.66347,0,0,0-5.78739-19.48083M184.412,71.781a69.52887,69.52887,0,0,1,20.74978-1.487A27.61015,27.61015,0,0,1,210.863,80.65155a14.07557,14.07557,0,0,1-.71769,10.01889A146.12178,146.12178,0,0,0,184.412,71.781m6.98165-16.07038a55.6803,55.6803,0,0,0-23.71794-6.45916,43.3225,43.3225,0,0,0-7.05069-5.71279,124.27675,124.27675,0,0,1,53.95848,25.47493,42.49122,42.49122,0,0,0-7.96322-1.69373,53.22364,53.22364,0,0,0-15.22663-11.60925m-28.1905-6.35583c-6.95293.54545-12.86086,2.89944-16.53549,7.01035a129.93743,129.93743,0,0,0-56.59934-1.90043,113.03233,113.03233,0,0,0-18.574,5.27067v.01148c-.178.0689-.36164.14354-.54527.21245-.13772-.1895-.287-.38469-.42508-.57414a124.53515,124.53515,0,0,1,65.22347-18.31533q5.55453,0,10.9892.47654c5.74709.67747,11.30494,3.353,16.46646,7.80841M148.72892,281.20141c3.85265.30431,7.66465.47655,11.41988.47655,2.78453,0,5.54629-.08612,8.26179-.25837,3.69741-.22965,7.25744-.63156,10.67906-1.17125a124.84385,124.84385,0,0,1-41.6082,7.68209,45.52058,45.52058,0,0,0,11.24747-6.729m3.44475-2.97408a92.61049,92.61049,0,0,0,16.20818-20.83009c.10338-.17224.20115-.34447.29857-.51671,9.70907,5.31086,19.54395,10.08778,29.42508,14.47425-.683.39616-1.3779.76936-2.06685,1.1483-12.26968,4.7482-27.3698,6.68882-43.865,5.72425m31.343-31.515c4.19678-.08612,8.33643-.36171,12.37831-.83826,20.75575-2.46308,37.45173-9.88683,48.60739-21.364a124.33918,124.33918,0,0,1-36.27463,40.34537,214.60728,214.60728,0,0,1-24.71107-18.14309"
                            ></path>
                        </svg>
                    </div>
                </div>
                <div className="WordSection11">
                    <div className="info-section">
                        <div className="boilerplate-copyright">
                            <div className="copy-right">
                                <p id="_93a89090-d058-48fa-a08e-d1f009a671a0">
                                    {copyRightMark}
                                </p>
                                <p id="_07bc3273-c7d3-41e5-8a44-1320201fec4d">
                                    {copyRightText}
                                </p>
                            </div>
                        </div>
                        <div className="contact-info">
                            <p className="name">
                                International Telecommunication Union
                            </p>
                            <p className="address">
                                Place des Nations 1211 Geneva 20 Switzerland
                                <br />
                                <a href="mailto:itumail@itu.int">
                                    itumail@itu.int
                                </a>
                                <br />
                                <a href="www.itu.int">www.itu.int</a>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rule"></div>
            </div>
        </header>
    );
}