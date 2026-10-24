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
      <div dir="rtl" className="min-h-screen bg-ink text-cream grid place-items-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-gold mb-2">تعذر تحميل لوحة التحكم</h1>
          <p className="text-sm opacity-70 mb-1">Could not load the admin panel.</p>
          <p className="text-xs opacity-50 mb-5 break-words">{String(error?.message || error)}</p>
          <div className="flex gap-2 justify-center">
            <button type="button" onClick={reload} className="btn-gold">إعادة المحاولة / Retry</button>
            <a href="/" className="btn-ghost">الموقع / Website</a>
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
      <Suspense fallback={<div className="min-h-screen bg-ink" />}>
        <Admin />
      </Suspense>
    </ErrorBoundary>
  );
}
