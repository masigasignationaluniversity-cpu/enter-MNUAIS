import React from 'react';

interface State { hasError: boolean; }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4 p-8">
            <p className="text-lg font-medium text-foreground">Something went wrong.</p>
            <p className="text-sm text-muted-foreground">Please refresh the page to continue.</p>
            <button
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90"
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
