// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import './layout.css';

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
    return (
        <div id="layout" className={layoutClasses.join(' ')}>
            <header id="layout__header" className={headerClasses.join(' ')}>
                {header}
            </header>
            <main
                onScroll={handleMainScroll}
                id="layout__mainbar"
                className="layout__mainbar"
            >
                {mainBar}
            </main>
            <aside id="layout__sidebar" className={sidebarClasses.join(' ')}>
                {sideBar}
            </aside>
            {bonus}
        </div>
    );
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default Layout;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
