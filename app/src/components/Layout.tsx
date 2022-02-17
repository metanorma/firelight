// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useState } from 'react';
import TopButton from './TopButton';
// import { Data } from '../data/data';

// CSS is in `layout.css` because we need IDs for grid

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    isSidebarShown: boolean;
    isSidebarOpen: boolean;
    handleMainScroll: (e: React.UIEvent<HTMLElement, UIEvent>) => void;
    header: JSX.Element | JSX.Element[];
    mainBar: JSX.Element | JSX.Element[];
    sideBar: JSX.Element | JSX.Element[];
    bonus: JSX.Element | JSX.Element[];
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Layout(props: OwnProps) {
    const [visible, setVisible] = useState<boolean>(false);

    const {
        header,
        mainBar,
        sideBar,
        bonus,
        isSidebarShown,
        isSidebarOpen,
        handleMainScroll
    } = props;
    const layoutClasses = ['layout'];
    const headerClasses = ['layout__header'];
    const sidebarClasses = ['layout__sidebar'];
    layoutClasses.push(
        isSidebarShown
            ? 'layout--sidebar-emancipated'
            : 'layout--sidebar-shackled'
    );
    sidebarClasses.push(
        isSidebarShown
            ? 'layout__sidebar--emancipated'
            : 'layout__sidebar--shackled'
    );
    sidebarClasses.push(
        isSidebarOpen ? 'layout__sidebar--open' : 'layout__sidebar--closed'
    );

    const scrolled = (e: React.UIEvent<HTMLElement, UIEvent>) => {
        const current = e.currentTarget.scrollTop;

        if (current > 300) {
            setVisible(true);
        } else {
            setVisible(false);
        }
    };

    const onClick = () => { 
        document.getElementById('main_page')?.scrollIntoView({
            behavior: 'smooth'
        });
    };

    return (
        <div id="layout" className={layoutClasses.join(' ')}>
            <header id="layout__header" className={headerClasses.join(' ')}>
                {header}
            </header>
            <main
                // onScroll={handleMainScroll}
                id="layout__mainbar"
                className="layout__mainbar"
                onScroll={ e => {scrolled(e)}}
            >
                <TopButton visible={visible} click={onClick} />
                {/* <span id="main-top"></span> */}
                {mainBar}
                {/* <SourceCode code={Data.code} language="javascript" /> */}
                {/* <BackToTop anchorId="main-top" /> */}
            </main>
            <aside id="layout__sidebar" className={sidebarClasses.join(' ')}>
                {/* <span id="side-top"></span> */}
                {sideBar}
                {/* <SourceCode code={Data.code} language="javascript" /> */}
                {/* <BackToTop anchorId="side-top" /> */}
            </aside>
            {bonus}
        </div>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default Layout;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
