import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary, type UploadApiResponse, type UploadApiErrorResponse } from "cloudinary";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { connectDB } from "@/integrations/mongodb/connection";
import { Media } from "@/models/Media";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentMember(req);
    if (!user || user instanceof NextResponse || !("_id" in user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const formData = await req.formData();
    const file = formData.get("file");
    const altText = (formData.get("altText") as string) || "";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed types are: image/jpeg, image/png, image/webp" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the 5MB limit" },
        { status: 400 }
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim().replace(/^["']|["']$/g, "");
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim().replace(/^["']|["']$/g, "");
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim().replace(/^["']|["']$/g, "");

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary environment variables are not configured" },
        { status: 500 }
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "utft/profile",
          resource_type: "auto",
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            return reject(error || new Error("Cloudinary upload failed with no result"));
          }
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    const media = await Media.create({
      filename: uploadResult.public_id,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url: uploadResult.secure_url,
      altText: typeof altText === "string" ? altText : "",
      uploadedBy: user._id,
    });

    return NextResponse.json(
      {
        url: uploadResult.secure_url,
        data: media,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
