import { Schema, model, models, type InferSchemaType, type Model, type Types } from 'mongoose';

export interface MessageDoc {
  _id: Types.ObjectId,
  chat: Types.ObjectId;
  role: "user" | "assistant";
  message: string;
  created_at: Date;
}
const messageSchema = new Schema(
  {
    chat: { type: Schema.Types.ObjectId, ref: 'Chat' },
    role: { type: String },
    message: { type: String },
  },
  { timestamps: true },
);

export type Message = InferSchemaType<typeof messageSchema> & { chat: Types.ObjectId };

export const MessageModel: Model<Message> =
  models.Message ?? model<Message>('Message', messageSchema);

export default MessageModel;