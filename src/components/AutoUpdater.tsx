import { useEffect, useRef } from "react";
import { toast } from "sonner";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const LAST_CHECK_KEY = "markvision:last-update-check";
const LAST_RELOAD_KEY = "markvision:last-update-reload";

const readStoredTime = (key: string) => {
  if (typeof window === "undefined") return 0;
  const value = window.localStorage.getItem(key);
  const parsed = value ? Number(value) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Detects when a new version of the app has been deployed and auto-reloads.
 * Works for PWA installs (iOS "Add to Home Screen") where the HTML shell
 * stays cached after publishing.
 *
 * Strategy: extract the hashed asset URLs from the current document, then
 * periodically (and on app focus) fetch `/` and compare. If different — reload.
 */
export function AutoUpdater() {
  const initialFingerprint = useRef<string | null>(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const getFingerprintFromHtml = (html: string) => {
      // Match all hashed asset URLs (Vite-style: /assets/xxx-<hash>.js|.css)
      const matches = html.match(/\/_build\/[^"'\s]+|\/assets\/[^"'\s]+/g) ?? [];
      return matches.sort().join("|");
    };

    // Capture the fingerprint of the currently-loaded document
    initialFingerprint.current = getFingerprintFromHtml(document.documentElement.outerHTML);

    const check = async () => {
      if (reloadingRef.current) return;
      const now = Date.now();
      const lastReload = readStoredTime(LAST_RELOAD_KEY);
      if (lastReload && now - lastReload < ONE_DAY_MS) return;

      const lastCheck = readStoredTime(LAST_CHECK_KEY);
      if (lastCheck && now - lastCheck < ONE_DAY_MS) return;
      window.localStorage.setItem(LAST_CHECK_KEY, String(now));

      try {
        const res = await fetch("/", {
          cache: "no-store",
          headers: { "x-update-check": "1" },
        });
        if (!res.ok) return;
        const html = await res.text();
        const next = getFingerprintFromHtml(html);
        if (next && initialFingerprint.current && next !== initialFingerprint.current) {
          reloadingRef.current = true;
          window.localStorage.setItem(LAST_RELOAD_KEY, String(now));
          toast.success("Доступно обновление", {
            description: "Перезагружаем приложение…",
            duration: 1500,
          });
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        }
      } catch {
        // network offline — ignore
      }
    };

    // Check on focus / visibility, but hard-limited to once per day.
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);

    // Also poll once per day while open.
    const interval = window.setInterval(check, ONE_DAY_MS);

    // First check shortly after mount, respecting the daily throttle.
    const initial = window.setTimeout(check, 5000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      window.clearInterval(interval);
      window.clearTimeout(initial);
    };
  }, []);

  return null;
}