import React from 'react';


export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{
    fallback?: React.FC<ErrorBoundaryFallbackProps> | undefined;
  }>,
  { error?: string | undefined; }
> {
  constructor(props: {
    fallback?: React.FC<ErrorBoundaryFallbackProps> | undefined,
  }) {
    super(props);
    this.state = { error: undefined };
  }
  componentDidCatch(error: Error, info: any) {
    console.error(
      "Error boundary caught while rendering view",
      error,
      info,
    );
    this.setState({ error: `${error.name}: ${error.message}` });
  }
  render() {
    if (this.state.error !== undefined) {
      const Fallback = this.props.fallback ?? DefaultErrorBoundaryFallback;
      return <Fallback
        technicalDetails={this.state.error}
        technicalDetailsPlain={this.state.error}
      />;
    }
    return this.props.children;
  }
}


export interface ErrorBoundaryFallbackProps {
  technicalDetailsPlain: string;
  technicalDetails?: string | JSX.Element;
  className?: string;
}

export const DefaultErrorBoundaryFallback:
React.FC<ErrorBoundaryFallbackProps> =
function ({
  technicalDetailsPlain,
  technicalDetails,
  className,
}) {
  return (
    <div>
      <div style={{ textAlign: 'left' }}>
        <p>
          Encountered an error in this view.
        </p>
      </div>
      {technicalDetails || technicalDetailsPlain
        ? <div
              style={{ textAlign: 'left', transform: 'scale(0.9)' }}
              title="Technical details">
            {technicalDetails ?? technicalDetailsPlain}
          </div>
        : null}
    </div>
  );
};

export const DefaultErrorBoundaryFallbackINline:
React.FC<ErrorBoundaryFallbackProps> =
function ({
  technicalDetailsPlain,
  className,
}) {
  return <span title={technicalDetailsPlain} className={className}>
    [not available]
  </span>;
};


export default ErrorBoundary;
