// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './TubeMap.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    stops: number;
    current: number;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function TubeMap(props: OwnProps) {
    const { stops, current } = props;
    const tubeMapClasses = [styles['tube-map']];

    const stations: JSX.Element[] = [];
    let hasReached = false;
    for (let i = 1; i <= stops; i++) {
        const tubeStationClasses = [styles['tube-map__station']];
        if (i < current) {
            hasReached = true;
            tubeStationClasses.push(styles['tube-map__station--visited']);
        }
        if (i === current) {
            hasReached = true;
            tubeStationClasses.push(styles['tube-map__station--visited']);
            tubeStationClasses.push(styles['tube-map__station--current']);
        }
        if (i > current) {
            hasReached = false;
            tubeStationClasses.push(styles['tube-map__station--unvisited']);
        }
        const tubeStationId = `tube-station--${i}`;
        stations.push(
            <li
                className={tubeStationClasses.join(' ')}
                key={tubeStationId}
                title={`${i} of ${stops}`}
            >
                <input
                    id={tubeStationId}
                    name={tubeStationId}
                    type="checkbox"
                    checked={hasReached}
                    disabled
                    className="visuallyhidden"
                />
                <label htmlFor={tubeStationId} className="visuallyhidden">
                    {i}
                </label>
            </li>
        );
    }
    return <ol className={tubeMapClasses.join(' ')}>{stations}</ol>;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default TubeMap;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
