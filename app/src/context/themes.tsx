import { createGlobalStyle } from 'styled-components';

export const IsoTheme = {
    backgroundColor: 'white',
    textColor: 'black',
    darkerRed: '#d72d18',
    itemColor: 'white',
    itemBoxShadow: 'inset -5px 0px 10px -5px #d72d18 !important',
    titleFontWeight: '500',
    thBgColor: 'inherit'
};

export const ItuTheme = {
    backgroundColor: 'white',
    textColor: 'black',
    darkerRed: '#da1d52',
    itemColor: 'white',
    itemBoxShadow: 'inset -5px 0px 10px -5px #da1d52 !important',
    titleFontWeight: '400',  
    thBgColor: 'inherit'
};

export const OgcTheme = {
    backgroundColor: 'white',
    textColor: '#00335b',
    darkerRed: '#00335b',
    itemColor: 'white',
    itemBoxShadow: 'inset -5px 0px 10px -5px #00335b !important',
    titleFontWeight: '300',
    thBgColor: '#5d99d6'
};

export const GlobalStyle = createGlobalStyle`

  :root {
    --colour--bsi-darker-red: ${(props: any) => props.theme.darkerRed};
    --col--item-active: ${(props: any) => props.theme.itemColor};
    --col--item-active-boxshadow: ${(props: any) => props.theme.itemBoxShadow};
    --title-font-weight: ${(props: any) => props.theme.titleFontWeight};
    --th-bg-color: ${(props: any) => props.theme.thBgColor};
  }

  body {
    color: ${(props: any) => props.theme.textColor};
    background-color: ${(props: any) => props.theme.backgroundColor};
  }

  table {
    background-color: white !important;
  }

  table td, table th {
    padding: 1em;
  }
`;
