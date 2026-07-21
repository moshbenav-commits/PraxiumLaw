import axios from "axios";

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("praxium_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      const path = window.location.pathname;
      const isPublic =
        path === "/" ||
        path.startsWith("/login") ||
        path.startsWith("/signup") ||
        path.startsWith("/pricing") ||
        path.startsWith("/praxa") ||
        path.startsWith("/intake") ||
        path.startsWith("/verify-identity") ||
        path.startsWith("/portal") ||
        path.startsWith("/upload") ||
        path.startsWith("/sign") ||
        path.startsWith("/accept-invite");
      if (!isPublic) {
        localStorage.removeItem("praxium_token");
        localStorage.removeItem("praxium_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Streaming AI helper — uses fetch for proper stream handling
export async function streamAiChat({ matterId, message, sessionId, onChunk, onDone, isPraxa = false }) {
  const token = localStorage.getItem(isPraxa ? "praxa_token" : "praxium_token");
  const endpoint = isPraxa ? "/praxa/ai-coach" : "/ai/chat";
  const res = await fetch(`${API}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(isPraxa ? { message, session_id: sessionId } : { matter_id: matterId, message, session_id: sessionId }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const sid = res.headers.get("X-Session-Id");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    onChunk?.(chunk, full);
  }
  onDone?.(full, sid);
}
