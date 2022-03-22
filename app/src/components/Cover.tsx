// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useXmlData } from '../context';
import CoverIsoStandard from './CoverIsoStandard';
import CoverItuStandard from './CoverItuStandard';
import CoverOgcStandard from './CoverOgcStandard';
import './Cover.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function Cover() {
    const { xmlJson, xml } = useXmlData();
    
    if (xmlJson['iso-standard']) {
        return <CoverIsoStandard />;
    } else if (xmlJson['itu-standard']) {
        return <CoverItuStandard />;
    } else if (xmlJson['ogc-standard']) {
        return <CoverOgcStandard />
    }

    return <></>;
}
