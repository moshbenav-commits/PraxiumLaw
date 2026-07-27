import api from "@/lib/api";
import { downloadB64File } from "@/lib/documentsApi";

// Preview the matter-aware token merge for a template WITHOUT filing anything —
// returns { filled_count, needs_review: [{token, label}] } for staff review.
export async function previewDocgen(matterId, { filename, side, providerId } = {}) {
  const r = await api.post(`/matters/${matterId}/docgen/generate`, {
    filename,
    side: side || undefined,
    provider_id: providerId || undefined,
    commit: false,
  });
  return r.data;
}

// Commit: renders + files the watermarked DRAFT document on the matter, then downloads it.
export async function generateDocgen(matterId, { filename, side, providerId } = {}) {
  const r = await api.post(`/matters/${matterId}/docgen/generate`, {
    filename,
    side: side || undefined,
    provider_id: providerId || undefined,
    commit: true,
  });
  const doc = await api.get(`/documents/${r.data.document_id}/download`);
  downloadB64File(doc.data.name, doc.data.content_type, doc.data.data_b64);
  return r.data;
}

// AI classifier proposal for an already-uploaded document — never auto-applied.
// Staff confirms through the existing PATCH /documents/{id}/taxonomy route.
export async function classifyDocument(docId) {
  const r = await api.post(`/documents/${docId}/classify`);
  return r.data;
}
