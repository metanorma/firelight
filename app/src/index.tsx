// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import XmlProvider from './context';
import App from './App';
import ITUStandard from './pages/ITUStandard';
import CustomLoader from './pages/components/CustomLoader';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import './css/fireball.css';
ReactDOM.render(
    <React.StrictMode>
        <XmlProvider>
            <Router>
                <Routes>
                    <Route path="/app" element={<App />} />                    
                    <Route path="/" element={<ITUStandard/>} />
                </Routes>
            </Router>
        </XmlProvider>
    </React.StrictMode>,
    document.getElementById('root')
);

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
