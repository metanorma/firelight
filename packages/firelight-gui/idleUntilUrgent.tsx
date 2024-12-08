import React from 'react';


export function idleUntilUrgent<T>(WrappedComponent: React.FC<T>, ComponentId: string) {

  interface IdleUntilUrgent {
    firstRender: boolean;
    callbackId: number | null;
  }

  class IdleUntilUrgent extends React.Component<T, { renderChild: boolean }> {
    constructor(props: T) {
      super(props);
      this.firstRender = true;
      this.callbackId = null;
      this.state = {
        renderChild: false,
      };
    }

    shouldComponentUpdate(nextProps: T, nextState: { renderChild: boolean }) {
      return (
        this.props != nextProps || (nextState && nextState.renderChild)
      );
    }

    // to prevent calling setState on an unmounted component
    // and avoid memory leaks
    componentWillUnmount() {
      this.callbackId && cancelIdleCallback(this.callbackId);
    }

    enqueueIdleRender = () => {
      if (typeof requestIdleCallback !== "undefined") {
        this.callbackId = requestIdleCallback(() => {
          const root = document.getElementById(ComponentId);
          this.setState({
            renderChild: true
          });
        });
      } else {
        setTimeout(() => {
          const root = document.getElementById(ComponentId);
          this.setState({
            renderChild: true
          });
        });
      }
    };

    urgentRender = () => {
      this.setState({
        renderChild: true
      });
    };

    render = () => {
      if (typeof window !== "undefined" && this.firstRender) {
        this.firstRender = false;
        // Render at next opportunity
        this.enqueueIdleRender();
        // Preserve the server-rendered DOM tree
        return (
          <div
            dangerouslySetInnerHTML={{ __html: "" }}
            suppressHydrationWarning={true}
            onClick={this.urgentRender}
          />
        );
      } else {
        // Cancel the already scheduled render, if any
        this.callbackId && cancelIdleCallback(this.callbackId);
        return <WrappedComponent {...this.props} />;
      }
    };
  }

  const wrappedComponentName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  (IdleUntilUrgent as any).displayName = `IdleUntilUrgent (${wrappedComponentName})`;

  return IdleUntilUrgent;

}
