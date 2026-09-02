export const GLOBAL_REFRESH_EVENT =
  "hrms-global-refresh";

export function triggerGlobalRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(
        GLOBAL_REFRESH_EVENT
      )
    );
  }
}