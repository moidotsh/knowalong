// shared/utils/user-agent.ts
// Canonical user-agent parser. Returns a rich object so each call site
// can project the fields it needs without re-implementing detection.
//
// Arqavellum ships the parser; consumers extend NATIVE_APP_MARKERS below
// with their own app-shell UA identifier (e.g. 'MyApp/') if they ship
// a native wrapper. Web-only consumers can ignore that field entirely.

export type Browser =
  | 'Firefox'
  | 'Edge'
  | 'Chrome'
  | 'Safari'
  | 'Opera'
  | 'IE'
  | 'Unknown';

export type OS =
  | 'iOS'
  | 'Android'
  | 'Windows'
  | 'macOS'
  | 'Linux'
  | 'ChromeOS'
  | 'Unknown';

/** Coarse form-factor. */
export type DeviceCategory = 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';

/** Fine-grained platform bucket. */
export type PlatformType =
  | 'ios'
  | 'android'
  | 'windows'
  | 'mac'
  | 'linux'
  | 'other'
  | 'unknown';

export interface UserAgentInfo {
  browser: Browser;
  os: OS;
  /** Coarse form-factor: Desktop / Mobile / Tablet. */
  deviceCategory: DeviceCategory;
  /** Audience-facing bucket, e.g. "iOS App", "iPhone Web", "Desktop Web". */
  accessPlatform: string;
  /** Fine-grained platform type. */
  platformType: PlatformType;
  /** Audience-facing device label, e.g. "iOS Device", "Mac", "Windows PC". */
  displayName: string;
  /** True when the UA looks like a native app shell (RN/Expo wrappers). */
  isNativeApp: boolean;
}

/**
 * Markers that indicate a native app shell. Arqavellum includes the generic
 * React Native / Expo markers. Consumers extending arqavellum with their own
 * native shell should add their app's identifier here (e.g. 'MyApp/').
 */
const NATIVE_APP_MARKERS = ['ExpoKit/', 'ReactNative'];

export function parseUserAgentInfo(ua: string | null | undefined): UserAgentInfo {
  if (!ua) {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      deviceCategory: 'Unknown',
      accessPlatform: 'Unknown',
      platformType: 'unknown',
      displayName: 'Unknown Device',
      isNativeApp: false,
    };
  }

  // --- Browser (check in order — UAs lie) ---
  let browser: Browser = 'Unknown';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';
  else if (ua.includes('MSIE') || ua.includes('Trident/')) browser = 'IE';

  const isNativeApp = NATIVE_APP_MARKERS.some((marker) => ua.includes(marker));

  let os: OS = 'Unknown';
  let deviceCategory: DeviceCategory = 'Desktop';
  let accessPlatform = 'Desktop Web';
  let platformType: PlatformType = 'other';
  let displayName = 'Other Device';

  if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
    platformType = 'ios';
    if (ua.includes('iPad')) {
      deviceCategory = 'Tablet';
      accessPlatform = isNativeApp ? 'iPad App' : 'iPad Web';
      displayName = 'iOS Device';
    } else {
      deviceCategory = 'Mobile';
      accessPlatform = isNativeApp ? 'iOS App' : 'iPhone Web';
      displayName = 'iOS Device';
    }
  } else if (ua.includes('Android')) {
    os = 'Android';
    platformType = 'android';
    deviceCategory = 'Mobile';
    accessPlatform = isNativeApp ? 'Android App' : 'Android Web';
    displayName = 'Android Device';
  } else if (ua.includes('Windows')) {
    os = 'Windows';
    platformType = 'windows';
    accessPlatform = 'Desktop Web';
    displayName = 'Windows PC';
  } else if (ua.includes('Mac OS') || ua.includes('Mac')) {
    os = 'macOS';
    platformType = 'mac';
    accessPlatform = 'Desktop Web';
    displayName = 'Mac';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
    platformType = 'linux';
    accessPlatform = 'Desktop Web';
    displayName = 'Linux';
  } else if (ua.includes('CrOS')) {
    os = 'ChromeOS';
    platformType = 'other';
    accessPlatform = 'Desktop Web';
    displayName = 'Other Device';
  }

  // Mobile/Tablet refinement (covers generic "Mobi" UAs not caught above).
  // iPad UAs contain "Mobile/15E148" so the iPad/Tablet branch must come first
  // — otherwise the iPad case set above gets overwritten to Mobile.
  if (ua.includes('iPad') || ua.includes('Tablet')) {
    deviceCategory = 'Tablet';
  } else if (ua.toLowerCase().includes('mobile') || ua.includes('Mobi')) {
    deviceCategory = 'Mobile';
    if (accessPlatform === 'Desktop Web') accessPlatform = 'Mobile Web';
  }

  return {
    browser,
    os,
    deviceCategory,
    accessPlatform,
    platformType,
    displayName,
    isNativeApp,
  };
}
