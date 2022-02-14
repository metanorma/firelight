import { createGlobalStyle } from 'styled-components';

export const IsoTheme = {
    backgroundColor: 'white',
    textColor: 'black'
};

export const ItuTheme = {
    backgroundColor: 'white',
    textColor: 'black'
};

export const OgcTheme = {
    backgroundColor: 'white',
    textColor: '#00335b'
};

export const GlobalStyle = createGlobalStyle`
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
