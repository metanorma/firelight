// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useXmlData } from '../context';
import MainPageForISO from './MainPageForISO';
import MainPageForITU from './MainPageForITU';
import MainPageForOGC from './MainPageForOGC';
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function MainPage() {
    const { xmlJson } = useXmlData();

    if (xmlJson['itu-standard']) {
        return <MainPageForITU />;
    } else if (xmlJson['iso-standard']) {
        return <MainPageForISO xmlJson={xmlJson} />;
    } else if (xmlJson['ogc-standard']) {
        return <MainPageForOGC />;
    }

    return <></>;
}
