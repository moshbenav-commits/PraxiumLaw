async function capturePhotoFromVideo(video) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error("Camera is not ready");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not capture photo");
  ctx.drawImage(video, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode photo"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}
function blobToFile(blob, fileName) {
  return new File([blob], fileName, { type: blob.type || "image/jpeg" });
}
export {
  blobToFile,
  capturePhotoFromVideo
};
