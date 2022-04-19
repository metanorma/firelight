// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

import { useEffect } from 'react';
import Prism from 'prismjs';
import styles from './SourceCode.module.css';
import 'prismjs/themes/prism-tomorrow.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

interface OwnProps {
    code: string;
    language: string;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

function SourceCode(props: OwnProps) {
    const { language, code } = props;
    useEffect(() => {
        Prism.highlightAll();
    }, []);
    return (
        <div className={styles['source-code']}>
            <pre>
                <code className={`language-${language}`}>{code.trim()}</code>
            </pre>
        </div>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

export default SourceCode;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 