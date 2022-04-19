// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useXmlData } from '../context';
import MainPageForISO from './MainPageForISO';
import MainPageForITU from './MainPageForITU';
import MainPageForOGC from './MainPageForOGC';
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function MainPage() {
    const { xmlJson, xml } = useXmlData();

    if (xmlJson['itu-standard']) {
        return <MainPageForITU />;
    } else if (xmlJson['iso-standard']) {
        return <MainPageForISO />;
    } else if (xmlJson['ogc-standard']) {
        return <MainPageForOGC />;
    }

    return <></>;
}
