import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/fileUpload/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const url = await uploadToCloudinary(file, "utft/profile");
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || "Upload failed" }, { status: 500 });
  }
}
