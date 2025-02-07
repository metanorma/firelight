import React from 'react';


class ErrorBoundaryWithCustomFallback extends React.Component<
  React.PropsWithChildren<{ fallback: JSX.Element }>,
  { error?: string | undefined; }
> {
  constructor(props: { fallback: JSX.Element }) {
    super(props);
    this.state = { error: undefined };
  }
  componentDidCatch(error: Error, info: any) {
    console.error("Error rendering view", error, info);
    this.setState({ error: `${error.name}: ${error.message}` });
  }
  render() {
    if (this.state.error !== undefined) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}


export default ErrorBoundaryWithCustomFallback;
