const CLOUD_NAME = "dncqmk2eh";
const UPLOAD_PRESET = "nomitai_chat";

export async function uploadImage(file: File): Promise<string> {
  // 送信前にリサイズ（最大1200px）
  const resized = await resizeImage(file, 1200);

  const formData = new FormData();
  formData.append("file", resized);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    throw new Error("画像のアップロードに失敗しました");
  }

  const data = await res.json();
  return data.secure_url as string;
}

function resizeImage(file: File, maxSize: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxSize && height <= maxSize) {
        resolve(file);
        return;
      }
      if (width > height) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("リサイズ失敗"))),
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => reject(new Error("画像の読み込みに失敗"));
    img.src = URL.createObjectURL(file);
  });
}
