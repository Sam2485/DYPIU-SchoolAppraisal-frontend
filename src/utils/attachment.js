/**
 * Utility to resolve absolute attachment URLs, prepending the backend API base URL
 * if the attachment url is relative (e.g. starting with /uploads/).
 * If the url is already absolute (GCP storage public URL starting with http/https),
 * it returns the url unmodified.
 */
export const getAttachmentUrl = (url) => {
  if (!url) return "";

  let resolvedUrl = url;
  const isLocalOrVm = 
    window.location.hostname === "localhost" || 
    window.location.hostname === "127.0.0.1" || 
    window.location.hostname.startsWith("10.") || 
    window.location.hostname.startsWith("192.168.") || 
    window.location.hostname.startsWith("172.");

  if (isLocalOrVm && typeof resolvedUrl === "string" && resolvedUrl.startsWith("https://storage.googleapis.com/")) {
    const match = resolvedUrl.match(/https:\/\/storage\.googleapis\.com\/[^\/]+\/(.+)/);
    if (match && match[1]) {
      resolvedUrl = "/uploads/" + match[1];
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
  
  const apiBaseUrl = globalThis.__APP_CONFIG__?.VITE_API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
  const cleanBase = apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
  const cleanPath = resolvedUrl.startsWith("/") ? resolvedUrl : "/" + resolvedUrl;
  return `${cleanBase}${cleanPath}`;
};
