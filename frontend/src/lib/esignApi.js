import axios from "axios";
import api from "@/lib/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export async function listSignRequests(matterId) {
  const params = matterId ? { matter_id: matterId } : {};
  const r = await api.get("/sign-requests", { params });
  return r.data.items || [];
}

export async function createSignRequest(matterId, payload) {
  const r = await api.post(`/matters/${matterId}/sign-requests`, payload);
  return r.data;
}

export async function getSignLinkInfo(token) {
  const r = await axios.get(`${API}/sign/${token}/info`);
  return r.data;
}

export async function submitSignature(token, body) {
  const r = await axios.post(`${API}/sign/${token}`, body);
  return r.data;
}
