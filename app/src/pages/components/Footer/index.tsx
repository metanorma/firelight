import React from 'react';

import './style.css';

interface Props {
    generatedDate?: Date;
    copyRight?: string;
    message?: string;
}

const Footer = ({ generatedDate, copyRight, message }: Props) => {
    return (
        <footer className="footer">
            <div className="copyright">
                <div className="doc-access">
                    Generated: {generatedDate ? generatedDate: '2021-06-29 Metanorma 1.3.5'}
                </div>
                <p className="year">{copyRight ? copyRight : '© International Telecommunications Union'}</p>
                <p className="message">
                    {message ? message : 'All rights reserved. Unless otherwise specified, no part of this publication may be reproduced or utilized otherwise in any form or by any means, electronic or mechanical, including photocopying, or posting on the internet or an intranet, without prior written permission.'}
                </p>
            </div>
        </footer>
    );
};

export default Footer;
