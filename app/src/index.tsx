// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import XmlProvider from './context';
import App from './App';
import AppIso from './AppIso';
import ITUStandard from './pages/ITUStandard';
import Home from './pages/Home';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import './css/firelight.css';
ReactDOM.render(
    <React.StrictMode>
        <XmlProvider>
            <Router>
                <Routes>
                    <Route path="/app" element={<App />} />
                    <Route path="/app_iso" element={<AppIso />} />
                    <Route path="/documents" element={<ITUStandard/>} />
                    <Route path="/" element={<Home/>} />
                </Routes>
            </Router>
        </XmlProvider>
    </React.StrictMode>,
    document.getElementById('root')
);

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
