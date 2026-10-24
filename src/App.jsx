import React, { Suspense, lazy } from 'react';
import Site from './Site.jsx';

// The admin panel lives at /admin (not linked from the public site) and is code-split,
// so visitors never download the admin or PDF code.
const Admin = lazy(() => import('./Admin.jsx'));
const isAdmin = () => /^\/admin\/?$/.test(window.location.pathname);

export default function App() {
  if (!isAdmin()) return <Site />;
  return <Suspense fallback={<div className="min-h-screen bg-ink" />}><Admin /></Suspense>;
}
