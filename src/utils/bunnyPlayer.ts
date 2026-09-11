// Bunny Stream expone su iframe player mediante el protocolo `player.js`
// (https://bunny.net/docs/stream/playback-api.md). No hay paquete npm oficial;
// Bunny lo distribuye desde su propio CDN y expone un global `window.playerjs`.

export interface BunnyPlayerInstance {
  on(event: string, callback: (data?: any) => void): void;
  off(event: string, callback?: (data?: any) => void): void;
  play(): void;
  pause(): void;
  getDuration(callback: (duration: number) => void): void;
  getCurrentTime(callback: (time: number) => void): void;
  setCurrentTime(seconds: number): void;
  supports(type: string, method: string): boolean;
}

declare global {
  interface Window {
    playerjs?: {
      Player: new (iframe: HTMLIFrameElement | string) => BunnyPlayerInstance;
    };
  }
}

const PLAYERJS_SRC =
  "https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js";

let loadPromise: Promise<void> | null = null;

/** Carga (una sola vez) el script de player.js requerido por el player de Bunny. */
export function loadBunnyPlayerScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.playerjs) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PLAYERJS_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("No se pudo cargar player.js de Bunny"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = PLAYERJS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("No se pudo cargar player.js de Bunny"));
    document.head.appendChild(script);
  });

  return loadPromise;
}
