import React from 'react';


class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ viewName?: string | undefined; inline?: boolean | undefined; }>,
  { error?: string | undefined; }
> {
  constructor(props: { viewName?: string | undefined; inline?: boolean | undefined }) {
    super(props);
    this.state = { error: undefined };
  }
  componentDidCatch(error: Error, info: any) {
    console.error("Error rendering view", this.props.viewName, error, info);
    this.setState({ error: `${error.name}: ${error.message}` });
  }
  render() {
    if (this.state.error !== undefined) {
      return <ErrorState
        inline={this.props.inline}
        viewName={this.props.viewName}
        technicalDetails={this.state.error}
      />;
    }
    return this.props.children;
  }
}


export default ErrorBoundary;



// TODO: Give suggestions to resolve (move from dataset view)
export interface ErrorStateProps {
  inline?: boolean | undefined;
  technicalDetails?: string | JSX.Element;
  error?: string;
  viewName?: string | undefined;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = function ({
  inline,
  technicalDetails,
  error,
  viewName,
  className,
}) {
  if (inline) {
    return <span title={error} className={className}>
      [failed to render {viewName ?? 'view'}]
    </span>;
  } else {
    return (
      <div>
        <div style={{ textAlign: 'left' }}>
          <p>
            We encountered an error in {viewName || 'a'} view.
          </p>
        </div>
        {technicalDetails || error
          ? <div style={{ textAlign: 'left', transform: 'scale(0.9)' }} title="Technical details">
            {technicalDetails}
            {error
              ? <pre style={{ overflow: 'auto', paddingBottom: '1em' }}>
                  {error || 'error information is unavailable'}
                </pre>
              : null}
          </div>
          : null}
      </div>
    );
  }
};
