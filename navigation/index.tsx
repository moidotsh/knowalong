// navigation/index.tsx
// Barrel for the navigation helper layer. All raw router calls live in
// `NavigationHelper.tsx` (the C1-audited exempt site); other files
// import the typed helpers from here.

export {
  NavigationPath,
  navigationHierarchy,
  navigateToHome,
  navigateToLogin,
  navigateToRegister,
  navigateToForgotPassword,
  navigateToSettings,
  navigateToPremiumShowcase,
  navigateToImport,
  navigateToSource,
  navigateToSection,
  navigateToLemma,
  navigateToReview,
  navigateToKnowAlongDemo,
  navigateToSourceAnalysis,
  navigateToAnalysisRun,
  navigateToClcc,
  navigateToClccRun,
  navigateToCompanionSettings,
  replaceWithHome,
  replaceWithLogin,
  replaceWithRegister,
  replaceWithForgotPassword,
  safeGoBack,
  goBack,
  routerInstance,
  type Router,
} from './NavigationHelper';
