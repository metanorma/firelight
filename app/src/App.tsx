// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useState } from 'react';
import Checklist from './components/Checklist';
import Hamburger from './components/Hamburger';
import Knob from './components/Knob';
import Layout from './components/Layout';
import Logo from './components/Logo';
import Modal from './components/Modal';
import ProgressBar from './components/ProgressBar';
import StealthTitle from './components/StealthTitle';
import { Data } from './data/data';

interface CheckList {
    [key: string]: boolean;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function App() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSidebarShown, setIsSidebarShown] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [ isStealthTitleVisible, setIsStealthTitleVisible ] = useState(false);
    const SCROLL_THRESHOLD = 500;

    const [checklist, setChecklist] = useState({
        ...(Data.checklist as CheckList)
    });

    const max = Object.keys(checklist).length;
    const value = Object.keys(checklist).filter((item: string) => checklist[item] === true).length;

    return (
        <div className="App">
            <Layout
                handleMainScroll={(e: React.UIEvent<HTMLElement, UIEvent>) => {
                    const { scrollTop } = e.currentTarget;
                    setIsStealthTitleVisible(scrollTop > SCROLL_THRESHOLD);
                }}
                isSidebarShown={isSidebarShown}
                isSidebarOpen={isSidebarOpen}
                header={[
                    <Logo key="logo" />,
                    <Hamburger
                        key="hamburger"
                        onClick={() => setIsSidebarShown(!isSidebarShown)}
                    />,
                    <StealthTitle isStealthTitleVisible={isStealthTitleVisible} />,
                    <Knob
                        key="knob--false"
                        isOpen={false}
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    />
                ]}
                mainBar={[
                    <ProgressBar
                        key="progress-bar--1"
                        onClick={() => setIsModalOpen(true)}
                        action="Open Checklist"
                        progress={{ max, value }}
                    />,
                    <div dangerouslySetInnerHTML={{ __html: Data.main }} />
                ]}
                sideBar={[
                    <ProgressBar
                        key="progress-bar--2"
                        onClick={() => setIsModalOpen(true)}
                        action="Open Checklist"
                        progress={{ max, value }}
                    />,
                    <Knob
                        key="knob--true"
                        isOpen={true}
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    />,
                    <div dangerouslySetInnerHTML={{ __html: Data.side }} />
                ]}
                bonus={
                    <Modal
                        key="modal"
                        isOpen={isModalOpen}
                        handleClose={() => setIsModalOpen(false)}
                    >
                        <Checklist
                            checklist={checklist}
                            handleChange={(key: string) => {
                                const updatedChecklist = { ...checklist };
                                updatedChecklist[key] = !updatedChecklist[key];
                                setChecklist(updatedChecklist);
                            }}
                        />
                        <div dangerouslySetInnerHTML={{ __html: Data.modal }} />
                    </Modal>
                }
            />
        </div>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default App;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
