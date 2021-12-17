// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import XmlProvider from './context';
import App from './App';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import './css/fireball.css';
ReactDOM.render(
    <React.StrictMode>
        <XmlProvider>
            <Router>
                <App />
            </Router>
        </XmlProvider>
    </React.StrictMode>,
    document.getElementById('root')
);

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
