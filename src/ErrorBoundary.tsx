import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-2xl w-full border border-red-100">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-4xl">🚨</span>
              <h1 className="text-2xl font-bold text-slate-800">網頁發生了非預期的錯誤</h1>
            </div>
            
            <p className="text-slate-600 mb-6">
              很抱歉，應用程式在執行時遇到了一個錯誤，為了防止進一步的資料損毀，我們暫停了畫面渲染。您可以嘗試重新載入網頁。
            </p>

            <div className="bg-slate-100 p-4 rounded border border-slate-200 overflow-x-auto mb-6">
              <h3 className="text-red-600 font-bold mb-2 font-mono text-sm">
                {this.state.error && this.state.error.toString()}
              </h3>
              <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={() => window.location.reload()}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded transition-colors shadow-md shadow-red-500/20"
              >
                重新載入網頁
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
