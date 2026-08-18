import { createHmac } from "crypto";

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME?.trim().replace(/^["']|["']$/g, "");
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY?.trim().replace(/^["']|["']$/g, "");
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET?.trim().replace(/^["']|["']$/g, "");

export async function uploadToCloudinary(file: File | Blob | Buffer, folder = "utft/profile") {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary environment variables are not configured");
  }

  const timestamp = Math.round(Date.now() / 1000).toString();

  const params: Record<string, string> = {
    timestamp,
    folder,
  };

  const stringToSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join("&");

  const signature = createHmac("sha1", CLOUDINARY_API_SECRET).update(stringToSign).digest("hex");

  if (process.env.NODE_ENV !== "production") {
    console.log("Cloudinary upload debug:", {
      cloudName: CLOUDINARY_CLOUD_NAME,
      stringToSign,
      signature,
    });
  }

  const formData = new FormData();
  formData.append("file", file as any);
  formData.append("api_key", CLOUDINARY_API_KEY);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudinary upload failed: ${error}`);
  }

  const data = await response.json();
  return data.secure_url as string;
}
