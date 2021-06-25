// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useState } from 'react';
import Banner from './components/Banner';
import Checklist from './components/Checklist';
import Hamburger from './components/Hamburger';
import Layout from './components/Layout';
import Logo from './components/Logo';
import Modal from './components/Modal';
import ProgressBar from './components/ProgressBar';
import StealthTitle from './components/StealthTitle';
import X from './components/X';
import { Data } from './data/data';
import { SimpleChecklist } from './Types';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function App() {
    const [isModalOpen, setModalOpen] = useState(false);
    const [isSidebarShown, setSidebarShown] = useState(true);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isStealthTitleVisible, setStealthTitleVisible] = useState(false);
    const STEALTH_TITLE__SCROLL_THRESHOLD_PX = 500;
    const [checklist, setChecklist] = useState({
        ...(Data.checklist as SimpleChecklist)
    });

    const checklistItemMax = Object.keys(checklist).length;
    const checklistItemCount = Object.keys(checklist).filter(
        (key: string) => checklist[key] === true
    ).length;

    const bonus = [];
    bonus.push(
        <Modal isOpen={isModalOpen} handleClose={() => setModalOpen(false)}>
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
    );
    if (isSidebarOpen) {
        bonus.push(
            <div
                className="layout__overlay"
                onClick={() => setSidebarOpen(false)}
            ></div>
        );
    }

    return (
        <div className="App">
            <Layout
                handleMainScroll={(e: React.UIEvent<HTMLElement, UIEvent>) => {
                    const { scrollTop } = e.currentTarget;
                    setStealthTitleVisible(
                        scrollTop > STEALTH_TITLE__SCROLL_THRESHOLD_PX
                    );
                }}
                isSidebarShown={isSidebarShown}
                isSidebarOpen={isSidebarOpen}
                header={
                    <Banner>
                        <Logo />
                        <StealthTitle
                            isStealthTitleVisible={isStealthTitleVisible}
                            title={Data.title}
                        />
                        <Hamburger
                            isDesktop={false}
                            isActive={isSidebarOpen}
                            activeText={'Close Sidebar'}
                            inactiveText={'Open Sidebar'}
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                        />
                        <Hamburger
                            isDesktop={true}
                            isActive={isSidebarShown}
                            activeText={'Hide Sidebar'}
                            inactiveText={'Show Sidebar'}
                            onClick={() => setSidebarShown(!isSidebarShown)}
                        />
                    </Banner>
                }
                mainBar={[
                    <ProgressBar
                        onClick={() => setModalOpen(true)}
                        action="Open Checklist"
                        progress={{
                            max: checklistItemMax,
                            value: checklistItemCount
                        }}
                        isLarge={true}
                    />,
                    <div className="cms" dangerouslySetInnerHTML={{ __html: Data.main }} />
                ]}
                sideBar={[
                    <X
                        text="Close Sidebar"
                        onClick={() => setSidebarOpen(false)}
                    />,
                    <ProgressBar
                        onClick={() => setModalOpen(true)}
                        action="Open Checklist"
                        progress={{
                            max: checklistItemMax,
                            value: checklistItemCount
                        }}
                        isLarge={false}
                    />,
                    <div dangerouslySetInnerHTML={{ __html: Data.side }} />
                ]}
                bonus={bonus}
            />
        </div>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default App;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
