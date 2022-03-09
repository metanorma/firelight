import React from 'react';
import { useXmlData } from '../../../context';

import './style.css';

const Footer = () => {
    const { documentDetail } = useXmlData();

    return (
        <footer className="footer">
            <div className="copyright">
                <div className="doc-access">
                    {documentDetail?.generateDate ? 'Generated: ' + documentDetail?.generateDate: ''}
                    {documentDetail?.version ? ' Metanorma ' + documentDetail?.version: ''}
                    
                </div>
                <p className="year">©{documentDetail?.type ? documentDetail?.type : ' Metanorma'}</p>
                <p className="message">
                    {documentDetail?.message ? documentDetail?.message : 'All rights reserved. Unless otherwise specified, no part of this publication may be reproduced or utilized otherwise in any form or by any means, electronic or mechanical, including photocopying, or posting on the internet or an intranet, without prior written permission.'}
                </p>
            </div>
        </footer>
    );
};

export default Footer;
