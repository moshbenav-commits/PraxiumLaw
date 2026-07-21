import axios from "axios";
import api from "@/lib/api";

const API = import.meta.env.REACT_APP_BACKEND_URL
  ? `${import.meta.env.REACT_APP_BACKEND_URL}/api`
  : "http://localhost:8000/api";

export async function listSignRequests(matterId) {
  const params = matterId ? { matter_id: matterId } : {};
  const r = await api.get("/sign-requests", { params });
  return r.data.items || [];
}

export async function createSignRequest(matterId, payload) {
  const r = await api.post(`/matters/${matterId}/sign-requests`, payload);
  return r.data;
}

export async function patchSignFields(signId, fields) {
  const r = await api.patch(`/sign-requests/${signId}/fields`, { fields });
  return r.data;
}

export async function getSignLinkInfo(token) {
  const r = await axios.get(`${API}/sign/${token}/info`);
  return r.data;
}

export async function getSignDocument(token) {
  const r = await axios.get(`${API}/sign/${token}/document`);
  return r.data;
}

export async function getSignedPdfPublic(token) {
  const r = await axios.get(`${API}/sign/${token}/signed-pdf`);
  return r.data;
}

export async function downloadSignedPdfStaff(signId) {
  const r = await api.get(`/sign-requests/${signId}/signed-pdf`);
  return r.data;
}

export async function submitSignature(token, body) {
  const r = await axios.post(`${API}/sign/${token}`, body);
  return r.data;
}

export async function resendSignInvite(signId) {
  const r = await api.post(`/sign-requests/${signId}/resend`);
  return r.data;
}

export async function getDocuSignStatus() {
  const r = await api.get("/integrations/docusign/status");
  return r.data;
}
