import { useEffect, useRef } from "react";
import { toast } from "sonner";

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
    initialFingerprint.current = getFingerprintFromHtml(
      document.documentElement.outerHTML,
    );

    const check = async () => {
      if (reloadingRef.current) return;
      try {
        const res = await fetch("/", {
          cache: "no-store",
          headers: { "x-update-check": "1" },
        });
        if (!res.ok) return;
        const html = await res.text();
        const next = getFingerprintFromHtml(html);
        if (
          next &&
          initialFingerprint.current &&
          next !== initialFingerprint.current
        ) {
          reloadingRef.current = true;
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

    // Check on focus / visibility (key for PWAs reopened from home screen)
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);

    // Also poll every 2 minutes while open
    const interval = window.setInterval(check, 2 * 60 * 1000);

    // First check shortly after mount
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