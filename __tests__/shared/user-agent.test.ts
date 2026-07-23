import { describe, it, expect } from 'vitest';
import { parseUserAgentInfo } from '../../shared/utils/user-agent';

describe('parseUserAgentInfo', () => {
  it('returns all-Unknown for null/undefined/empty input', () => {
    const expected = {
      browser: 'Unknown',
      os: 'Unknown',
      deviceCategory: 'Unknown',
      accessPlatform: 'Unknown',
      platformType: 'unknown',
      displayName: 'Unknown Device',
      isNativeApp: false,
    };
    expect(parseUserAgentInfo(null)).toEqual(expected);
    expect(parseUserAgentInfo(undefined)).toEqual(expected);
    expect(parseUserAgentInfo('')).toEqual(expected);
  });

  it('detects Chrome on macOS', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const info = parseUserAgentInfo(ua);
    expect(info.browser).toBe('Chrome');
    expect(info.os).toBe('macOS');
    expect(info.platformType).toBe('mac');
    expect(info.deviceCategory).toBe('Desktop');
    expect(info.accessPlatform).toBe('Desktop Web');
    expect(info.displayName).toBe('Mac');
    expect(info.isNativeApp).toBe(false);
  });

  it('detects Safari on iPhone', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
    const info = parseUserAgentInfo(ua);
    expect(info.browser).toBe('Safari');
    expect(info.os).toBe('iOS');
    expect(info.platformType).toBe('ios');
    expect(info.deviceCategory).toBe('Mobile');
    expect(info.accessPlatform).toBe('iPhone Web');
    expect(info.displayName).toBe('iOS Device');
    expect(info.isNativeApp).toBe(false);
  });

  it('detects Chrome on Android', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
    const info = parseUserAgentInfo(ua);
    expect(info.browser).toBe('Chrome');
    expect(info.os).toBe('Android');
    expect(info.platformType).toBe('android');
    expect(info.deviceCategory).toBe('Mobile');
    expect(info.accessPlatform).toBe('Android Web');
  });

  it('detects Edge (Chromium)', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
    const info = parseUserAgentInfo(ua);
    expect(info.browser).toBe('Edge');
    expect(info.os).toBe('Windows');
    expect(info.platformType).toBe('windows');
  });

  it('detects Firefox', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';
    const info = parseUserAgentInfo(ua);
    expect(info.browser).toBe('Firefox');
  });

  it('detects iPad as tablet form factor', () => {
    const ua =
      'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
    const info = parseUserAgentInfo(ua);
    expect(info.os).toBe('iOS');
    expect(info.deviceCategory).toBe('Tablet');
    expect(info.accessPlatform).toBe('iPad Web');
  });

  it('detects native React Native shell markers', () => {
    const ua = 'Something ReactNative/1.0';
    const info = parseUserAgentInfo(ua);
    expect(info.isNativeApp).toBe(true);
  });

  it('detects ExpoKit shell marker', () => {
    const ua = 'Something ExpoKit/2.0';
    const info = parseUserAgentInfo(ua);
    expect(info.isNativeApp).toBe(true);
  });

  it('detects Linux', () => {
    const ua =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const info = parseUserAgentInfo(ua);
    expect(info.os).toBe('Linux');
    expect(info.platformType).toBe('linux');
    expect(info.displayName).toBe('Linux');
  });

  it('detects ChromeOS', () => {
    const ua =
      'Mozilla/5.0 (X11; CrOS x86_64 14541.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const info = parseUserAgentInfo(ua);
    expect(info.os).toBe('ChromeOS');
    // ChromeOS has no PlatformType equivalent; bucketed as 'other'.
    expect(info.platformType).toBe('other');
  });
});
