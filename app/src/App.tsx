// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useEffect, useState } from "react";
import Banner from "./components/Banner";
import Button from "./components/Button";
import ButtonGroup from "./components/ButtonGroup";
import Checklist from "./components/Checklist";
import Hamburger from "./components/Hamburger";
import Layout from "./components/Layout";
import Logo from "./components/Logo";
import Modal from "./components/Modal";
import ProgressBar from "./components/ProgressBar";
import StealthTitle from "./components/StealthTitle";
import TubeMap from "./components/TubeMap";
import { Data } from "./data/data";
import { ButtonType } from "./Enums";
import { SimpleChecklist } from "./Types";
import NavIMenu from "./components/NavMenu";
import MainPage from "./components/MainPage";
import presentationData from "./data/document-presentation";
import { parseString } from "xml2js";
// import XMLData from "./data/document-l3";
// import X from "./components/X";
const xmlParser = require("react-xml-parser");

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function App() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSidebarShown, setSidebarShown] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isStealthTitleVisible, setStealthTitleVisible] = useState(true);
  const STEALTH_TITLE__SCROLL_THRESHOLD_PX = 500;
  const [checklist, setChecklist] = useState({
    ...(Data.checklist as SimpleChecklist),
  });
  const [xmlData, setXmlData] = useState({});

  useEffect(() => {
    parseString(presentationData, {}, function (err, result) {
      setXmlData(result);

      const xml = new xmlParser().parseFromString(presentationData);
      console.log(xml, 'xml')
    });
  }, []);

  const checklistItemMax = Object.keys(checklist).length;
  const checklistItemCount = Object.keys(checklist).filter(
    (key: string) => checklist[key] === true
  ).length;

  const bonusElements = [];
  bonusElements.push(
    <Modal
      key="modal"
      isOpen={isModalOpen}
      handleClose={() => setModalOpen(false)}
    >
      <Checklist
        checklist={checklist}
        handleChange={(key: string) => {
          const updatedChecklist = { ...checklist };
          updatedChecklist[key] = !updatedChecklist[key];
          setChecklist(updatedChecklist);
        }}
      />
      <TubeMap stops={10} current={0} />
      <div dangerouslySetInnerHTML={{ __html: Data.modal }} />
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
          <Banner>
            <Logo />
            <StealthTitle
              isVisible={isStealthTitleVisible}
              title={Data.title}
            />
            <div>
              <Hamburger
                isDesktop={false}
                isActive={isSidebarOpen}
                activeText={"Close Sidebar"}
                inactiveText={"Open Sidebar"}
                onClick={() => setSidebarOpen(!isSidebarOpen)}
              />
              <Hamburger
                isDesktop={true}
                isActive={isSidebarShown}
                activeText={"Hide Sidebar"}
                inactiveText={"Show Sidebar"}
                onClick={() => setSidebarShown(!isSidebarShown)}
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
          <MainPage xmlData={xmlData} key="main-page"/>,
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
          <NavIMenu xmlData={xmlData} />,
        ]}
        bonus={bonusElements}
      />
    </div>
  );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default App;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
