// context/index.ts
// Barrel for React Context providers. Arqavellum ships AuthProvider (auth) +
// ThemeProvider (light/dark switching) + ToastProvider (non-blocking
// toasts); consumers add domain providers as needed.

export { AuthProvider, useAuth } from './AuthContext';
export { ThemeProvider, useAppTheme } from './ThemeContext';
export type { ColorSchemePreference } from './ThemeContext';
export { ToastProvider, useToast } from './ToastContext';
export type { Toast, ToastType } from './ToastContext';
