// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.

// Web-only port: MineSkin's Capacitor/native share branches are dropped; the
// iOS long-press sheet and the Android in-app-browser fallback stay.
type ShareFileResult = "downloaded" | "failed" | "cancelled";

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

async function tryWebShareFile(file: File): Promise<boolean> {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (!nav.canShare?.({ files: [file] })) return false;
  try {
    await nav.share({ files: [file] });
    return true;
  } catch (error) {
    if ((error as Error).name === "AbortError") return true;
    return false;
  }
}

/**
 * Labels for the iOS save fallback sheet. Defaults are English; callers with
 * access to the i18n dictionary should pass localized strings.
 */
export interface SaveImageLabels {
  /** Long-press path (real Safari without file-share support). */
  title: string;
  instruction: string;
  done: string;
  /** Shown when the current browser can't export at all (in-app browsers). */
  cannotExportTitle: string;
  cannotExportMessage: string;
}

const DEFAULT_LABELS: SaveImageLabels = {
  title: "Save image",
  instruction:
    "Press and hold the image, then tap “Add to Photos” or “Save Image”.",
  done: "Done",
  cannotExportTitle: "Can't export skin",
  cannotExportMessage: "Skins can not be exported from this browser.",
};

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)![1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Android browsers that silently swallow blob-anchor downloads. Tencent's X5
 * kernel (WeChat, QQ, QQ Browser), UC, and most social in-app WebViews route
 * `<a download>` through the host app's download listener, which can't fetch
 * a `blob:` URL — the tap does nothing and the user thinks export is broken.
 * They do keep the long-press "Save image" menu, so we fall back to that.
 */
function isAndroidInAppBrowser(): boolean {
  const ua = navigator.userAgent;
  if (!/Android/i.test(ua)) return false;
  return (
    /MicroMessenger/i.test(ua) || // WeChat
    /MQQBrowser|QQ\//.test(ua) || // QQ Browser / QQ app (X5)
    /UCBrowser/i.test(ua) ||
    /FBAN|FBAV|FB_IAB/.test(ua) || // Facebook / Messenger
    /Instagram/.test(ua) ||
    /\bLine\//.test(ua) ||
    /Twitter/.test(ua) ||
    /(BytedanceWebview|musical_ly|TikTok)/.test(ua) ||
    /Snapchat/.test(ua) ||
    /LinkedInApp/.test(ua) ||
    /Pinterest/.test(ua) ||
    /; wv\)/.test(ua) // generic Android WebView
  );
}

function makeOverlay(label: string): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", label);
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    // Radix Dialog/Popover sets pointer-events:none on <body> while open;
    // our overlay lives on <body> so it must re-enable interaction itself.
    "pointer-events:auto",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "justify-content:center",
    "gap:20px",
    "padding:24px",
    "box-sizing:border-box",
    "background:rgba(0,0,0,0.92)",
    "backdrop-filter:blur(4px)",
    "-webkit-backdrop-filter:blur(4px)",
    "padding-top:max(24px,env(safe-area-inset-top))",
    "padding-bottom:max(24px,env(safe-area-inset-bottom))",
  ].join(";");
  return overlay;
}

const FONT = "system-ui,-apple-system,sans-serif";

function makeTitle(text: string): HTMLDivElement {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = `color:#fff;font-size:18px;font-weight:600;text-align:center;font-family:${FONT}`;
  return el;
}

function makeInstruction(text: string): HTMLDivElement {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = `color:rgba(255,255,255,0.85);font-size:14px;line-height:1.5;text-align:center;max-width:340px;font-family:${FONT}`;
  return el;
}

function makeButton(text: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = text;
  btn.style.cssText = [
    "appearance:none",
    "border:none",
    "border-radius:999px",
    "padding:12px 32px",
    "font-size:16px",
    "font-weight:600",
    "color:#000",
    "background:#fff",
    "cursor:pointer",
    `font-family:${FONT}`,
  ].join(";");
  return btn;
}

const OVERLAY_ID = "miski-save-overlay";

function presentOverlay(overlay: HTMLDivElement): () => void {
  // Singleton: repeated download taps must not stack overlays (tapping "Done"
  // on a stack only reveals the next identical one and looks broken).
  document.getElementById(OVERLAY_ID)?.remove();
  overlay.id = OVERLAY_ID;

  const prevOverflow = document.body.style.overflow;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.body.style.overflow = prevOverflow;
    overlay.remove();
  };
  // Tapping the backdrop itself (not the image/buttons) dismisses.
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.body.style.overflow = "hidden";
  document.body.appendChild(overlay);
  return close;
}

/**
 * Fallback for browsers that can't hand us a file download but still render
 * the page directly: iOS Safari without file-share support, and Android
 * in-app browsers. Both keep the long-press "Save image" menu on an <img>.
 * Resolves once the user dismisses the sheet, so callers can follow up
 * (toasts, analytics) without racing the overlay.
 */
function showLongPressSheet(
  dataUrl: string,
  labels: SaveImageLabels,
): Promise<void> {
  const overlay = makeOverlay(labels.title);
  const title = makeTitle(labels.title);

  const img = document.createElement("img");
  img.src = dataUrl;
  img.alt = labels.title;
  img.draggable = false;
  img.style.cssText = [
    "max-width:min(80vw,360px)",
    "max-height:55vh",
    "width:auto",
    "height:auto",
    "border-radius:12px",
    "background:#fff",
    "box-shadow:0 8px 32px rgba(0,0,0,0.5)",
    "image-rendering:pixelated",
    "-webkit-touch-callout:default",
    "-webkit-user-select:none",
    "user-select:none",
  ].join(";");

  const instruction = makeInstruction(labels.instruction);
  const doneBtn = makeButton(labels.done);

  return new Promise((resolve) => {
    const close = presentOverlay(overlay);
    // presentOverlay wires backdrop taps to `close`; observe removal so every
    // dismissal path settles the promise.
    const observer = new MutationObserver(() => {
      if (!overlay.isConnected) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true });
    doneBtn.addEventListener("click", close);

    overlay.append(title, img, instruction, doneBtn);
  });
}

export async function downloadFile(
  dataUrl: string,
  filename: string,
  labels: SaveImageLabels = DEFAULT_LABELS,
): Promise<ShareFileResult> {
  const blob = dataUrlToBlob(dataUrl);
  const file = new File([blob], filename, { type: blob.type });

  // iOS Safari can't save via a blob anchor click, and Android in-app
  // browsers (WeChat, QQ, UC, social apps, …) drop blob downloads on the
  // floor. Prefer the share sheet in both, then the long-press "Save Image"
  // callout that keeps working there.
  if (isIOS() || isAndroidInAppBrowser()) {
    const shared = await tryWebShareFile(file);
    if (shared) return "downloaded";
    await showLongPressSheet(dataUrl, labels);
    return "downloaded";
  }

  // Desktop / Android: a plain blob anchor download.
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return "downloaded";
}
