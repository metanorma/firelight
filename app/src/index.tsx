// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import XmlProvider from './context';
import App from './App';
import ITUStandard from './pages/ITUStandard';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import './css/fireball.css';
ReactDOM.render(
    <React.StrictMode>
        <XmlProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<App />} />                    
                    <Route path="itu-standard-dashboard" element={<ITUStandard/>} />
                </Routes>
            </Router>
        </XmlProvider>
    </React.StrictMode>,
    document.getElementById('root')
);

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
