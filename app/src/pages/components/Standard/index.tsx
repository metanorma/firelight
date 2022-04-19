import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useXmlData } from '../../../context';

export interface StandardType {
    type?: string;
    generateDate?: string;
    version?: string;
    title?: string;
    data?: any;
}

const Standard = ({data}: StandardType) => {
    const { setDocumentDetail } = useXmlData();
    const navigate = useNavigate();

    const handleClick = () => {
        setDocumentDetail(data);
        navigate('/documents');
    };

    return (
        <div className="standard" onClick={() => handleClick()}>
            {data.title}
        </div>
    );
};

export default Standard;
