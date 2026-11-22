import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

export type ChatDoc = {
    _id?: string;
    chat?: Schema.Types.ObjectId;
    role?: "user" | "assistant";
    message?: string;
    title?: string;
    model?: string;
    user?: Schema.Types.ObjectId;
}

const chatSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId },
    title: { type: String },
    model: { type: String, default: "gh/gpt-5.4-nano" }
  },
  { timestamps: true },
);

export type Chat = InferSchemaType<typeof chatSchema>;

export const ChatModel: Model<Chat> =
  models.Chat ?? model<Chat>('Chat', chatSchema);

export default ChatModel;
