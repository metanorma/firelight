import { createGlobalStyle } from 'styled-components';

export const IsoTheme = {
    defaultSize: '16px',
    fontFamiliy: '"Cambria",serif',
    backgroundColor: 'white',
    textColor: 'black',
    lineHeight: 1.3,

    //nav item part
    darkerRed: '#d72d18',
    itemColor: 'white',
    itemBoxShadow: 'inset -5px 0px 10px -5px #d72d18 !important',
    titleFontWeight: '500',
    thBgColor: 'inherit',

    //note part
    noteBGColor: '#fff495',
    noteColor: 'black',

    //title part
    title1: '1.5em',
    title1Weight: '300',
    title2: '1.3em',
    title2Weight: '400',

    //table part
    table: '',

    exFontSize: '17px',
    exleColor: 'black',
    exBackground: 'inherit;',

    contentFontSize: '16px',
    contentColor: 'white',
    contentBackground: '#33eeff',

    adnomitionBackground: '#ffb3b3',
    adnomitionColor: '#ffb3b3', 
};

export const ItuTheme = {
    defaultSize: '15px',
    fontFamiliy: '"Times New Roman",serif',
    backgroundColor: 'white',
    textColor: 'black',
    lineHeight: '1.6em',

    //nav item part
    darkerRed: '#da1d52',
    itemColor: 'white',
    itemBoxShadow: 'inset -5px 0px 10px -5px #da1d52 !important',
    titleFontWeight: '400',
    thBgColor: 'inherit',
    //note part
    noteBGColor: '#ffca3a',
    noteColor: 'black',

    //title part
    title1: '1.6em',
    title1Weight: '300',
    title2: '1.5em',
    title2Weight: '400',

    //table part
    // table: 'table:not(.biblio), table:not(.biblio) th, table:not(.biblio)table:not(.biblio) td, tr {border: none !important;} table:not(.biblio) tr:nth-child(odd) {background: #f6f8fa;} table:not(.biblio) tr:nth-child(even) {background: #f1f8ff;}',
    table: 'table {border-collapse: collapse;border-spacing: 0;} table, table th, table td, tr {border: none !important;} table tr:nth-child(odd) {background: #f6f8fa;} table tr:nth-child(even) {background: #f1f8ff;}',
    exFontSize: 'inherit',
    exleColor: 'black',
    exBackground: 'white;',

    contentFontSize: '16px',
    contentColor: 'white',
    contentBackground: '#33eeff',

    adnomitionBackground: '#ffb3b3',
    adnomitionColor: '#ffb3b3', 
};

export const OgcTheme = {
    defaultSize: '16px',
    fontFamiliy: '"Overpass",sans-serif',
    backgroundColor: '#f6f8fa;',
    textColor: '#00335b',
    lineHeight: 1.5,

    //nav item part
    darkerRed: '#00335b',
    itemColor: 'white',
    itemBoxShadow: 'inset -5px 0px 10px -5px #00335b !important',
    titleFontWeight: '300',
    thBgColor: '#5d99d6',
    //note part
    noteBGColor: '#fff8bb',
    noteColor: '#7d760b',

    //title part
    title1: '1.8em',
    title1Weight: '300',
    title2: '1.7em',
    title2Weight: '400',

    //table part
    table: 'table, table th, table td { border: 1px solid black;font-size: 0.95em;}',
    exFontSize: '17px',
    exleColor: 'black',
    exBackground: '#fcad88;',

    contentFontSize: '16px',
    contentColor: 'white',
    contentBackground: '#33eeff',

    adnomitionBackground: '#fcad88',
    adnomitionColor: '#eb5a06', 
};

export const GlobalStyle = createGlobalStyle`

  :root {
    --colour--bsi-darker-red: ${(props: any) => props.theme.darkerRed};
    --col--item-active: ${(props: any) => props.theme.itemColor};
    --col--item-active-boxshadow: ${(props: any) => props.theme.itemBoxShadow};
    --title-font-weight: ${(props: any) => props.theme.titleFontWeight};
    --th-bg-color: ${(props: any) => props.theme.thBgColor};

    --note-bg-color: ${(props: any) => props.theme.noteBGColor};
    --note-color: ${(props: any) => props.theme.noteColor};
    
    --title1-size: ${(props: any) => props.theme.title1};
    --title1-weight: ${(props: any) => props.theme.title1Weight};
    --title2-size: ${(props: any) => props.theme.title2};
    --title2-weight: ${(props: any) => props.theme.title2Weight};

    --example1-size: ${(props: any) => props.theme.exFontSize};

    --content-weight: ${(props: any) => props.theme.contentFontSize};
    --content-color: ${(props: any) => props.theme.contentColor};
    --content-background: ${(props: any) => props.theme.contentBackground};

    --adnomition-color: ${(props: any) => props.theme.adnomitionColor};
    --adnomition-background: ${(props: any) => props.theme.adnomitionBackground};
  }

  html, body {
    color: ${(props: any) => props.theme.textColor};
    background-color: ${(props: any) => props.theme.backgroundColor};
    font-size: ${(props: any) => props.theme.defaultSize};
    line-height: ${(props: any) => props.theme.lineHeight};
    font-family: ${(props: any) => props.theme.fontFamiliy};
  }

  main {
    overflow-x: hidden;
  }

  table {
    background-color: white !important;
  }

  table td, table th {
    padding: 1em;
  }

  .loader {
    background-color: rgba(0, 0, 0, 0.3) !important;
  }
  
  ${(props: any) => props.theme.table}
  
`;
