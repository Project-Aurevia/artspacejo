import React, { Suspense, lazy } from 'react';
import Site from './Site.jsx';

// The admin panel lives at /admin (not linked from the public site) and is code-split,
// so visitors never download the admin or PDF code.
const Admin = lazy(() => import('./Admin.jsx'));
const isAdmin = () => /^\/admin\/?$/.test(window.location.pathname);

/**
 * Guards the lazily-loaded admin chunk: a failed chunk download (stale deploy, flaky
 * network) or a render crash would otherwise leave a blank screen with no way back.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Admin panel crashed:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const reload = () => window.location.reload();
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-canvas p-6 text-fg">
        <div className="max-w-md rounded-3xl border border-line/10 bg-surface p-7 text-center shadow-soft">
          <h1 className="mb-2 font-ar text-xl font-bold text-fg">تعذر تحميل لوحة التحكم</h1>
          <p className="mb-1 text-sm text-muted">Could not load the admin panel.</p>
          <p className="mb-5 break-words text-xs text-subtle" dir="ltr">{String(error?.message || error)}</p>
          <div className="flex justify-center gap-2">
            <button type="button" onClick={reload} className="btn btn-gold">إعادة المحاولة / Retry</button>
            <a href="/" className="btn btn-ghost">الموقع / Website</a>
          </div>
        </div>
      </div>
    );
  }
}

export default function App() {
  if (!isAdmin()) return <Site />;
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="min-h-screen bg-canvas" role="status" aria-label="Loading admin" />}>
        <Admin />
      </Suspense>
    </ErrorBoundary>
  );
}
