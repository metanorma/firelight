// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import styles from './BackToTop.module.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    anchorId: string;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function BackToTop(props: OwnProps) {
    const { anchorId } = props;
    return (
        <p role="navigation" className={styles['back-to-top']}>
            <a href={`#${anchorId}`}>
                <abbr title="Back to Top">&uarr;</abbr>
            </a>
        </p>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default BackToTop;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
