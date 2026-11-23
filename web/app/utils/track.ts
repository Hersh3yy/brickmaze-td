/**
 * Send an Umami event. Does nothing when Umami is not loaded (ad blockers, local dev,
 * deploy previews) and never throws, so tracking cannot break the game loop.
 * https://docs.umami.is/docs/track-events
 *
 * Keep the data flat (strings, numbers, booleans) and free of personal data or free text.
 * The list of events and where they fire is in the README.
 */
export type TrackData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track: (name: string, data?: TrackData) => void };
  }
}

export function track(name: string, data?: TrackData): void {
  try {
    if (typeof window !== 'undefined' && typeof window.umami?.track === 'function') {
      window.umami.track(name, data);
    }
  } catch {
    // Analytics must never throw into the game.
  }
}
