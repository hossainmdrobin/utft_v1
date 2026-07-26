import { Schema, model, models, Document } from "mongoose";

interface IMember extends Document {
  stage:string,
  joinDate?: Date | string
  profile_photo?:string,
  user_id: string;
  password: string;
  role: string;
  createdBy?: string | { user_id: string; role: string; full_name?: string };
  form_no: string;
  full_name?: string;
  father_name?: string;
  mother_name?: string;
  date_of_birth?: string;
  gender?: string;
  profession?: string;
  nationality?: string;
  religion?: string;
  blood_group?: string;
  education?: string;
  present_address?: string;
  permanent_address?: string;
  nid?: string;
  mobile?: string;
  email?: string;
  member_type?: string;
  share_quantity?: number;
  nominee_name?: string;
  nominee_relation?: string;
  nominee_nid?: string;
  created_at?: string;
  updated_at?: string;
}

const memberSchema = new Schema<IMember>(
  {
    stage:{type:String, default:"initiated",enum:['initiated','pending','approved','rejected']},
    joinDate:{type:Date},
    profile_photo: { type: String, default: "" },
    user_id: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, default: "member", enum: ["admin", "president", "director", "accountant", "auditor", "member"] },
    createdBy: { type: Schema.Types.ObjectId, ref: "Member" },
    form_no: { type: String },
    full_name: { type: String },
    father_name: { type: String },
    mother_name: { type: String },
    date_of_birth: { type: String },
    gender: { type: String },
    profession: { type: String },
    nationality: { type: String },
    religion: { type: String },
    blood_group: { type: String },
    education: { type: String },
    present_address: { type: String },
    permanent_address: { type: String },
    nid: { type: String },
    mobile: { type: String },
    email: { type: String },
    member_type: { type: String,default:"founding" },
    share_quantity: { type: Number, default: 0 },
    nominee_name: { type: String },
    nominee_relation: { type: String },
    nominee_nid: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export const Member = models.Member || model<IMember>("Member", memberSchema);
export type MemberDoc = IMember;
