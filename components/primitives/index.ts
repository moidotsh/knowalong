// components/primitives/index.ts
// Barrel for atomic primitives. LoadingSpinner / LoadingOverlay /
// AppLoading are the three ActivityIndicator wrappers that audit C4
// requires; ToastContainer renders the global toast stack — it MUST
// sit inside a <ToastProvider> in the root layout. AuthGuard is the
// central auth-flow redirect wrapper — sits inside <AuthProvider>.
// AppErrorBoundary is the top-level render-error boundary — wraps the
// root layout OUTSIDE ThemeProvider so it still renders when the theme
// system is the source of the crash.

export { LoadingSpinner } from './LoadingSpinner';
export { LoadingOverlay } from './LoadingOverlay';
export { AppLoading } from './AppLoading';
export { ToastContainer } from './Toast';
export { AuthGuard } from './AuthGuard';
export { AppErrorBoundary } from './AppErrorBoundary';
