import api from "@/lib/api";

export function b64ToBlobUrl(dataB64, contentType = "application/pdf") {
  const bin = atob(dataB64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], { type: contentType });
  return URL.createObjectURL(blob);
}

export function downloadB64File(name, contentType, dataB64) {
  const url = b64ToBlobUrl(dataB64, contentType);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function viewDocument(docId) {
  const r = await api.get(`/documents/${docId}/view`);
  return r.data;
}

export async function getDocumentText(docId) {
  const r = await api.get(`/documents/${docId}/text`);
  return r.data;
}

export async function reorderDocumentPages(docId, order) {
  const r = await api.post(`/documents/${docId}/pages/reorder`, { order });
  return r.data;
}

export async function appendDocumentPages(docId, sourceDocumentId) {
  const r = await api.post(`/documents/${docId}/pages/append`, {
    source_document_id: sourceDocumentId,
  });
  return r.data;
}

export function isPdfDoc(doc) {
  const ct = doc?.content_type || "";
  const name = doc?.name || "";
  return ct.includes("pdf") || name.toLowerCase().endsWith(".pdf");
}
