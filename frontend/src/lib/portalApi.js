import axios from "axios";
import { API } from "@/lib/api";

const PORTAL_TOKEN_KEY = "praxium_portal_token";
const PORTAL_CONTACT_KEY = "praxium_portal_contact";

const portalApi = axios.create({ baseURL: API });

portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(PORTAL_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

portalApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      const path = window.location.pathname;
      if (path.startsWith("/portal") && !path.startsWith("/portal/login") && !path.startsWith("/portal/verify")) {
        localStorage.removeItem(PORTAL_TOKEN_KEY);
        localStorage.removeItem(PORTAL_CONTACT_KEY);
        window.location.href = "/portal/login";
      }
    }
    return Promise.reject(err);
  }
);

export function getPortalToken() {
  return localStorage.getItem(PORTAL_TOKEN_KEY);
}

export function setPortalSession({ token, contact }) {
  localStorage.setItem(PORTAL_TOKEN_KEY, token);
  if (contact) localStorage.setItem(PORTAL_CONTACT_KEY, JSON.stringify(contact));
}

export function clearPortalSession() {
  localStorage.removeItem(PORTAL_TOKEN_KEY);
  localStorage.removeItem(PORTAL_CONTACT_KEY);
}

export function getStoredPortalContact() {
  try {
    return JSON.parse(localStorage.getItem(PORTAL_CONTACT_KEY) || "null");
  } catch {
    return null;
  }
}

/** Public portal auth (no token). */
export async function requestPortalLink(email) {
  const r = await axios.post(`${API}/portal/request-link`, { email });
  return r.data;
}

export async function verifyPortalToken(token) {
  const r = await axios.post(`${API}/portal/verify`, { token });
  return r.data;
}

/** Public upload link (no auth). */
export async function getUploadLinkInfo(token) {
  const r = await axios.get(`${API}/upload/${token}/info`);
  return r.data;
}

export async function uploadViaMagicLink(token, file, name, taxonomy = {}) {
  const fd = new FormData();
  fd.append("file", file);
  if (name) fd.append("name", name);
  if (taxonomy.docType) fd.append("doc_type", taxonomy.docType);
  if (taxonomy.medicalCode) fd.append("medical_code", taxonomy.medicalCode);
  if (taxonomy.providerLabel) fd.append("provider_label", taxonomy.providerLabel);
  const r = await axios.post(`${API}/upload/${token}`, fd);
  return r.data;
}

export default portalApi;
