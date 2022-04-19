import { useState, useEffect } from 'react';
import './TopButton.css';

interface props {
    visible: boolean;
    click: () => void;
}

export default function TopButton({click, visible}: props) {
    

    return <button className="top-button" style={{display: visible? 'block' : 'none'}} onClick={e => click()} >Top</button>;
}
