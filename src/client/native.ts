import { Capacitor } from '@capacitor/core';
import { settings } from './settings';

export const isNative = () => Capacitor.isNativePlatform();

/** Server origin for API/WebSocket calls. Native builds must be configured with VITE_SERVER_URL. */
export const serverOrigin = (): string => (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/\/$/, '') || location.origin;

/** Public origin used in invite links (the domain that serves Universal/App Links). */
export const publicOrigin = (): string => (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.replace(/\/$/, '') || serverOrigin();

export type HapticKind = 'light' | 'medium' | 'heavy';

export async function haptic(kind: HapticKind) {
  if (!settings.haptics) return;
  if (isNative()) {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const style = kind === 'heavy' ? ImpactStyle.Heavy : kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light;
    await Haptics.impact({ style }).catch(() => {});
    return;
  }
  navigator.vibrate?.(kind === 'heavy' ? [40, 30, 60] : kind === 'medium' ? 25 : 10);
}

/** Native share sheet (WhatsApp, iMessage, Telegram, SMS…). Returns false if unavailable. */
export async function shareLink(url: string, title: string, text: string): Promise<boolean> {
  try {
    if (isNative()) {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, url, dialogTitle: title });
      return true;
    }
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return true;
    }
  } catch (e) {
    // User cancelled the sheet: still counts as handled.
    if ((e as Error)?.name === 'AbortError') return true;
  }
  return false;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Universal Links / App Links: route https://…/m/<room> into the app. */
export async function onDeepLink(handler: (path: string) => void) {
  if (!isNative()) return;
  const { App } = await import('@capacitor/app');
  App.addListener('appUrlOpen', ({ url }) => {
    try {
      handler(new URL(url).pathname);
    } catch {
      /* ignore malformed */
    }
  });
}
