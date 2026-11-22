import { Schema, model, models, Document, Types, Model } from "mongoose";

export interface IMedia extends Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  altText?: string;
  uploadedBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const mediaSchema = new Schema<IMedia>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    altText: { type: String, default: "" },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "Member", required: true },
  },
  { timestamps: true }
);

export const Media: Model<IMedia> =
  models.Media || model<IMedia>("Media", mediaSchema);

export type MediaDoc = IMedia;
export default Media;
