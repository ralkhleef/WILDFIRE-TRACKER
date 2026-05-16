export const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5050";

export function getToken() {
  return localStorage.getItem("token");
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

export async function apiJson(path, options = {}) {
  const res = await fetch(`${apiBase}${path}`, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.details?.[0]?.msg || body?.message || "Request failed.");
  }
  return body;
}
