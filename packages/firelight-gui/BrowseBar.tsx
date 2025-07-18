import React, { useState, useEffect } from 'react';
import { defaultTheme, Provider, type ProviderProps } from '@adobe/react-spectrum';
import { Toolbar, Group } from 'react-aria-components';
import { ProgressCircle, ToggleButton } from '@adobe/react-spectrum';
import HierarchyIcon from '@spectrum-icons/workflow/TextBulletedHierarchy';
//import Bookmark from '@spectrum-icons/workflow/Bookmark';
import Search from '@spectrum-icons/workflow/Search';
//import Settings from '@spectrum-icons/workflow/Settings';
//import Branch1 from '@spectrum-icons/workflow/Branch1';
import { type Versioning } from 'anafero/index.mjs';
import { type LoadProgress } from './loader.mjs';
import { type BrowsingMode } from './model.mjs';
import classNames from './style.module.css';


interface BrowserBarProps {
  /** Workspace title. */
  title: string;
  /** Domain-relative URL to workspace root. */
  rootURL: string;
  providerProps?: Omit<ProviderProps, 'children'>,
  loadProgress?: LoadProgress | true | undefined;
  activeBrowsingMode?: BrowsingMode | undefined;
  onDeactivate?: () => void;
  onActivateBrowsingMode?: (mode: BrowsingMode) => void;
  versioning?: Versioning;
}

/**
 * Houses representation bar, load progress if any,
 * optionally expandable to navigation sidebar.
 *
 * This component is intended to be usable during SSG with almost no props
 * (though title is required), and in that case it’d hide load progress.
 */
export const BrowserBar: React.FC<BrowserBarProps> = function ({
  providerProps,
  title,
  rootURL,
  loadProgress,
  activeBrowsingMode,
  onActivateBrowsingMode,
  onDeactivate,
  versioning,
}) {
  const [initialRender, setInitialRender] = useState(true);
  useEffect(() => {
    setInitialRender(false);
  }, []);

  const showToolbar = onActivateBrowsingMode || activeBrowsingMode;

  useEffect(() => {
    if (loadProgress) {
      console.time("BrowserBar progress spinner");
      return function cleanUp() {
        console.timeEnd("BrowserBar progress spinner");
      };
    }
    return;
  }, [!!loadProgress]);

  return (
    <Provider theme={defaultTheme} {...providerProps}>
      <div className={`
        ${classNames.browserBar}
        ${activeBrowsingMode ? classNames.browserBarExpanded : ''}
      `}>
        <header className={classNames.browserBarTitle}>
          <h1>
            <a href={rootURL} className={classNames.browserBarTitleLink}>
              {title}
            </a>
          </h1>
        </header>
        {showToolbar
          ? <Toolbar
                aria-label="Tools"
                orientation="vertical"
                className={classNames.browserBarToolbar}>
              <Group aria-label="Browsing mode" className={classNames.browserBarToolbarGroup}>
                <ToggleButton
                    aria-label="Resource hierarchy"
                    isSelected={activeBrowsingMode === 'hierarchy'}
                    onChange={(val) => val
                      ? onActivateBrowsingMode?.('hierarchy')
                      : onDeactivate?.()}
                    isDisabled={!onActivateBrowsingMode || (activeBrowsingMode === 'hierarchy' && !onDeactivate)}>
                  {/* https://github.com/adobe/react-spectrum/issues/6752#issuecomment-2444076769 */}
                  {/* @ts-expect-error */}
                  <HierarchyIcon size={TB_SIZE} />
                </ToggleButton>
                <ToggleButton
                    aria-label="Search by text"
                    isSelected={activeBrowsingMode === 'search'}
                    onChange={(val) => val
                      ? onActivateBrowsingMode?.('search')
                      : onDeactivate?.()}
                    isDisabled={!onActivateBrowsingMode || (activeBrowsingMode === 'search' && !onDeactivate)}>
                  {/* @ts-expect-error */}
                  <Search size={TB_SIZE} />
                </ToggleButton>
                {/*
                <ToggleButton
                    aria-label="Bookmarks"
                    isSelected={activeBrowsingMode === 'bookmarks'}
                    onChange={(val) => val
                      ? onActivateBrowsingMode?.('bookmarks')
                      : onDeactivate?.()}
                    //isDisabled={!onActivateBrowsingMode || (activeBrowsingMode === 'bookmarks' && !onDeactivate)}
                    isDisabled>
                  <Bookmark size={TB_SIZE} />
                </ToggleButton>
                {Object.keys(versioning?.versions ?? {}).length > 1

                  ? <ToggleButton
                        isDisabled
                        aria-label="Other versions">
                      <Branch1 size={TB_SIZE} />
                    </ToggleButton>
                  : null}
                */}
              </Group>
              {/*
              <Separator orientation="horizontal" />
              <Group aria-label="Settings" className={classNames.browserBarToolbarGroup}>
                <ToggleButton
                    isDisabled
                    aria-label="Settings">
                  <Settings size={TB_SIZE} />
                </ToggleButton>
              </Group>
              */}
            </Toolbar>
          : null}
        {!initialRender
          ? <div className={classNames.progressWrapper}>
              {loadProgress
                ? loadProgress === true
                  ? <ProgressCircle
                      aria-label="Loading…"
                      isIndeterminate
                    />
                  : <ProgressCircle
                      aria-label="Loading…"
                      minValue={0}
                      isIndeterminate={
                        // Set to indeterminate if:
                        // No total:
                        !loadProgress.total
                        ||
                        // Stuck in almost ending:
                        (loadProgress.total - 0.1) < loadProgress.done
                        ||
                        // Stuck in just beginning:
                        (loadProgress.total - loadProgress.done) < 0.1
                      }
                      maxValue={loadProgress.total}
                      value={loadProgress.done}
                    />
                : <ProgressCircle
                    aria-role="presentation"
                    aria-label="Firelight"
                    minValue={0}
                    maxValue={1}
                    value={0}
                    staticColor="black"
                    UNSAFE_className={classNames.progressIdle}
                  />}
            </div>
          : null}
      </div>
    </Provider>
  );
};


/** Toolbar button size. */
const TB_SIZE = "S";
