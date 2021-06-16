// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import './css/vendor/reset.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import './css/font-face.css';
import './css/layout.css';
import './css/fireball.css';
import './css/shame.css';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById('root')
);

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
