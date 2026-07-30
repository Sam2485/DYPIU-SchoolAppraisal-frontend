/**
 * Utility to resolve absolute attachment URLs, prepending the backend API base URL
 * if the attachment url is relative (e.g. starting with /uploads/).
 */
export const getAttachmentUrl = (url) => {
  if (!url) return "";

  let resolvedUrl = url;

  // Translate legacy GCP storage URLs to local VM upload paths if present in imported records
  if (typeof resolvedUrl === "string") {
    if (resolvedUrl.startsWith("https://storage.googleapis.com/")) {
      const match = resolvedUrl.match(/https:\/\/storage\.googleapis\.com\/[^/]+\/(.+)/);
      if (match && match[1]) {
        resolvedUrl = "/uploads/" + match[1];
      }
    }
    if (resolvedUrl.startsWith("users/")) {
      resolvedUrl = "/uploads/" + resolvedUrl;
    } else if (resolvedUrl.startsWith("/users/")) {
      resolvedUrl = "/uploads" + resolvedUrl;
    }
  }

  if (
    resolvedUrl.startsWith("http://") ||
    resolvedUrl.startsWith("https://") ||
    resolvedUrl.startsWith("blob:") ||
    resolvedUrl.startsWith("data:")
  ) {
    return resolvedUrl;
  }

  const apiBaseUrl = globalThis.__APP_CONFIG__?.VITE_API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? "";
  const cleanBase = apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
  const cleanPath = resolvedUrl.startsWith("/") ? resolvedUrl : "/" + resolvedUrl;
  return `${cleanBase}${cleanPath}`;
};
