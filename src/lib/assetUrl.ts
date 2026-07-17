// Resolve Lovable CDN asset pointers (`.asset.json`) into absolute URLs when
// needed. In the browser (web/preview) the relative `/__l5e/...` path is
// served correctly by the Lovable host. In the Capacitor native build the
// WebView origin is `https://localhost` (or `capacitor://localhost`), so the
// same relative path 404s. Detect that case and prefix the published CDN
// origin so assets load from the network.

const CDN_ORIGIN = "https://barakahapp.lovable.app";

function isNativeWebView(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  if (w.Capacitor?.isNativePlatform?.()) return true;
  const host = window.location.hostname;
  const proto = window.location.protocol;
  // Capacitor Android default: https://localhost, iOS: capacitor://localhost
  if (proto === "capacitor:") return true;
  if (host === "localhost" && (proto === "https:" || proto === "http:") && !!w.Capacitor) return true;
  return false;
}

export function assetUrl(pointer: { url: string } | string): string {
  const raw = typeof pointer === "string" ? pointer : pointer?.url ?? "";
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/__l5e/") && isNativeWebView()) {
    return CDN_ORIGIN + raw;
  }
  return raw;
}