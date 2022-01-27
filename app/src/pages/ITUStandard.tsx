import { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
    return <div className='itu-standard-dsahboard'>
        <Header/>
        <div className="main"></div>
        <Footer/>
    </div>
}

export default App;