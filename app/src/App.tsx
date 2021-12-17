// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useState } from 'react';
import Banner from './components/Banner';
import Button from './components/Button';
import ButtonGroup from './components/ButtonGroup';
import Hamburger from './components/Hamburger';
import Layout from './components/Layout';
import Logo from './components/Logo';
import Modal from './components/Modal';
import StealthTitle from './components/StealthTitle';
import TubeMap from './components/TubeMap';
import { useXmlData } from './context';
import { ButtonType } from './Enums';
import NavIMenu from './components/NavMenu';
import MainPage from './components/MainPage';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function App() {
    const [isModalOpen, setModalOpen] = useState(false);
    const [isSidebarShown, setSidebarShown] = useState(true);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isStealthTitleVisible, setStealthTitleVisible] = useState(true);
    const STEALTH_TITLE__SCROLL_THRESHOLD_PX = 500;
    const { title } = useXmlData();

    const bonusElements = [];
    bonusElements.push(
        <Modal
            key="modal"
            isOpen={isModalOpen}
            handleClose={() => setModalOpen(false)}
        >
            <TubeMap stops={10} current={0} />
            <ButtonGroup>
                <Button
                    text="&larr;  Previous"
                    type={ButtonType.Secondary}
                    onClick={() => null}
                />
                <Button
                    text="Do Something"
                    type={ButtonType.Tertiary}
                    onClick={() => null}
                />
                <Button
                    text="Next  &rarr;"
                    type={ButtonType.Secondary}
                    onClick={() => null}
                />
            </ButtonGroup>
        </Modal>
    );
    if (isSidebarOpen) {
        bonusElements.push(
            <div
                key="layout--overlay"
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
                    <Banner key="banner">
                        <Logo />
                        <StealthTitle
                            isVisible={isStealthTitleVisible}
                            title={title}
                        />
                        <div key="hamburger">
                            <Hamburger
                                isDesktop={false}
                                isActive={isSidebarOpen}
                                activeText={'Close Sidebar'}
                                inactiveText={'Open Sidebar'}
                                onClick={() => setSidebarOpen(!isSidebarOpen)}
                                key="mobile"
                            />
                            <Hamburger
                                isDesktop={true}
                                isActive={isSidebarShown}
                                activeText={'Hide Sidebar'}
                                inactiveText={'Show Sidebar'}
                                onClick={() => setSidebarShown(!isSidebarShown)}
                                key="desktop"
                            />
                        </div>
                    </Banner>
                }
                mainBar={[
                    // <TubeMap stops={7} current={3} />,
                    // <ProgressBar
                    //   onClick={() => setModalOpen(true)}
                    //   action="Open Checklist"
                    //   progress={{
                    //     max: checklistItemMax,
                    //     value: checklistItemCount,
                    //   }}
                    //   isLarge={true}
                    // />,
                    // <div
                    //   className="cms"
                    //   dangerouslySetInnerHTML={{ __html: Data.main }}
                    // />,
                    <MainPage key="main-page" />
                ]}
                sideBar={[
                    // <X
                    //     text="Close Sidebar"
                    //     onClick={() => setSidebarOpen(false)}
                    //     showDesktop={false}
                    //     showMobile={true}
                    // />,
                    // <ProgressBar
                    //     onClick={() => setModalOpen(true)}
                    //     action="Open Checklist"
                    //     progress={{
                    //         max: checklistItemMax,
                    //         value: checklistItemCount
                    //     }}
                    //     isLarge={false}
                    // />,
                    // <TubeMap stops={3} current={3} />,
                    // <div dangerouslySetInnerHTML={{ __html: Data.side }} />
                    <NavIMenu key="nav-meunu" />
                ]}
                bonus={bonusElements}
            />
        </div>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default App;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
