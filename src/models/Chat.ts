import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

export type ChatDoc ={
    chat: Schema.Types.ObjectId;
    role: "user" | "assistant";
    message: string;
}

const chatSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId },
    title: { type: String }
  },
  { timestamps: true },
);

export type Chat = InferSchemaType<typeof chatSchema>;

export const ChatModel: Model<Chat> =
  models.Chat ?? model<Chat>('Chat', chatSchema);

export default ChatModel;