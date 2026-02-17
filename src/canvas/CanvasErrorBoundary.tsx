import React from 'react';
import { logger } from '../utils/logger';

const ERROR_CONTAINER_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  gap: '12px',
  color: '#718096',
  fontFamily: 'system-ui, sans-serif',
};

const ERROR_MESSAGE_STYLE: React.CSSProperties = { fontSize: '16px', fontWeight: 500 };

const ERROR_DETAIL_STYLE: React.CSSProperties = { fontSize: '13px', color: '#a0aec0' };

const RETRY_BUTTON_STYLE: React.CSSProperties = {
  padding: '6px 16px',
  borderRadius: '6px',
  border: '1px solid #cbd5e0',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '13px',
  color: '#4a5568',
};

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that wraps the canvas content to prevent
 * rendering errors from crashing the entire application.
 */
export class CanvasErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logger.error('[CanvasErrorBoundary] Rendering error caught:', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={ERROR_CONTAINER_STYLE}>
          <p style={ERROR_MESSAGE_STYLE}>
            Something went wrong rendering the canvas.
          </p>
          <p style={ERROR_DETAIL_STYLE}>
            {this.state.error?.message}
          </p>
          <button
            onClick={this.handleRetry}
            style={RETRY_BUTTON_STYLE}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
