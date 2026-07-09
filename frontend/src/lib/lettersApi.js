import api from "@/lib/api";
import { downloadB64File } from "@/lib/documentsApi";

export async function getMatterLetters(matterId) {
  const r = await api.get(`/matters/${matterId}/letters`);
  return r.data;
}

// Generates the letter, files it as a matter document, then downloads it.
export async function generateLetter(matterId, payload) {
  const r = await api.post(`/matters/${matterId}/letters/generate`, payload);
  const doc = await api.get(`/documents/${r.data.document_id}/download`);
  downloadB64File(doc.data.name, doc.data.content_type, doc.data.data_b64);
  return r.data;
}

// Send an already-filed PDF letter through the NativeSign in-app signature flow.
// `letterDoc` is a recent-letter row (needs id + name); `client` is {name, email}.
export async function sendLetterForSignature(matterId, letterDoc, client) {
  const r = await api.post(`/matters/${matterId}/sign-requests`, {
    title: letterDoc.name || "Letter for signature",
    document_title: letterDoc.name || "Letter",
    document_id: letterDoc.id,
    signer_name: client?.name,
    signer_email: client?.email,
  });
  return r.data;
}

export async function aiDraftLetterNarrative(matterId, { letterType = "demand", instructions } = {}) {
  const r = await api.post(`/matters/${matterId}/letters/ai-draft`, {
    letter_type: letterType,
    instructions: instructions || undefined,
  });
  return r.data;
}
