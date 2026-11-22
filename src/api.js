const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Request failed: ${res.status}`);
  }
  return data;
}

export default apiFetch;
