
import { NextRequest, NextResponse } from "next/server";

import {
    AIMessage,
    BaseMessage,
    HumanMessage,
    mergeUsageMetadata,
    UsageMetadata,
} from "@langchain/core/messages";
import { connectDB } from "@/integrations/mongodb/connection";
import ChatModel, { ChatDoc } from "@/models/Chat";
import MessageModel, { MessageDoc } from "@/models/Message";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";
import { AgentEvent } from "@/lib/ai_service/events";
import { getAgent } from "@/lib/ai_service/mainAgent";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";



export async function GET(
    request: NextRequest,
    { params }: RouteContext,
) {
    try {
        const user = await getCurrentMember(request);
        if (!user?._id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { chatId } = await params;
        await connectDB();
        const chat = await ChatModel.findById(chatId).lean();
        const messages = await MessageModel.find({ chat: chatId }).sort({ createdAt: 1 }).lean();
        return NextResponse.json({ data: messages, chat });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
}
export const maxDuration = 300;

type RouteContext = {
    params: Promise<{ chatId: string }>;
};

type BodyType = { prompt: string; conversationId?: string; model?: string };

function encode(event: AgentEvent) {
    return new TextEncoder().encode(
        JSON.stringify(event) + "\n"
    );
}

function isAIMessage(
    message: BaseMessage
): message is AIMessage {
    return message instanceof AIMessage;
}

export async function POST(
    request: NextRequest,
    { params }: RouteContext,
) {
    try {
        console.log("AUTHENTICATING USER");
        // 1. Authenticate the request.
        const user = await getCurrentMember(request);
        if (!user?._id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 },);
        console.log('VALIDATION PROJECT ID')
        // 2. Validate request input.
        const { chatId } = await params;
        if (!/^[a-f\d]{24}$/i.test(chatId))
            return NextResponse.json({ error: "Invalid project ID" }, { status: 400 },);

        const body: BodyType = await request.json();

        if (!body || typeof body !== "object" || !("prompt" in body) || typeof body.prompt !== "string")
            return NextResponse.json({ error: "A prompt is required" }, { status: 400 },);
        // SAVING THE MESSAGE PROMPT
        await connectDB();
        const chat = await ChatModel.findById(chatId);
        const activeModel = body.model || chat?.model || process.env.DEFAULT_AI_MODEL || "gh/gpt-5.4-nano";

        if (body.model && chat && chat.model !== body.model) {
            await ChatModel.findByIdAndUpdate(chatId, { model: body.model });
        }

        let messages = await MessageModel.find({ chat: chatId })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();
        const prompt = body.prompt.trim();
        console.log("VALIDATING PROMPT")

        if ((!prompt || prompt.length > 10000) && messages?.length > 1)
            return NextResponse.json({ error: "Prompt must be 1-10000 characters" }, { status: 400 },);

        if (messages?.length > 1) {
            const newMessage = await MessageModel.create({ chat: chatId, role: "user", message: prompt });
            try {
                await AuditLog.create({
                    table_name: "Message",
                    record_id: String(newMessage._id),
                    action: "INSERT",
                    description: `User message sent in chat ${chatId} by ${(user as any).full_name || (user as any).user_id || (user as any).role}`,
                    new_data: { chat: chatId, role: "user", message: prompt },
                    changed_by: String((user as any)._id),
                    changed_at: new Date().toISOString(),
                });
            } catch (e) {
                console.log("Audit log error:", e);
            }
            messages = [newMessage, ...messages]
        }

        const history: BaseMessage[] = messages.reverse().map((message) => {
            return message.role === "user"
                ? new HumanMessage(message.message)
                : new AIMessage(message.message);
        });

        console.log('THE HISTORY:', history)

        const agentStartedAt = Date.now();

        const selectedAgent = getAgent(activeModel);

        const stream = await selectedAgent.stream(
            { messages: history } as any,
            {
                streamMode: "updates",
                configurable: {
                    thread_id: `${chatId}`,
                    userId: (user as any)._id,
                    role: (user as any).role,
                },
            }
        ) as any;
        // THE ASSISTANT MESSAGE VARIABLE
        let assistantResponse = "";
        // Aggregated token usage across all LLM calls in this agent run.
        let usage: UsageMetadata | undefined = undefined;

        function collectUsageFromChunk(chunk: any): void {
            const gather = (node: any): void => {
                if (node === null || node === undefined || typeof node !== "object") {
                    return;
                }
                if (Array.isArray(node.messages)) {
                    for (const message of node.messages) {
                        if (isAIMessage(message) && message.usage_metadata) {
                            usage = mergeUsageMetadata(usage, message.usage_metadata as UsageMetadata);
                        }
                    }
                }
                for (const key of Object.keys(node)) {
                    const val = node[key];
                    if (val !== null && val !== undefined && typeof val === "object") {
                        gather(val);
                    }
                }
            };
            gather(chunk);
        }

        const readable = new ReadableStream({
            async start(controller) {
                try {
                    controller.enqueue(encode({ type: "thinking" }))
                    for await (const chunk of stream) {
                        collectUsageFromChunk(chunk);
                        console.log(
                            "AGENT STREAM DURATION (seconds):",
                            ((Date.now() - agentStartedAt) / 1000).toFixed(1),
                        );
                        if (chunk.model_request) {
                            const messages = chunk.model_request.messages;


                            const update = chunk as {
                                messages?: Array<{
                                    type?: string;
                                    content?: unknown;
                                    name?: string;
                                    tool_calls?: unknown;
                                    toolCalls?: unknown;
                                }>;
                            };

                            if (Array.isArray(update.messages)) {
                                for (const message of update.messages) {
                                    console.log("[Agent message diagnostic]", {
                                        type: message.type,
                                        name: message.name,
                                        contentType: typeof message.content,
                                        contentIsArray: Array.isArray(message.content),
                                        content: message.content,
                                    });
                                }
                            }


                            console.log(
                                "MODEL UPDATE:",
                                messages.map((message) => ({
                                    type: message.getType(),
                                    content: typeof message.content === "string"
                                        ? message.content.slice(0, 200)
                                        : "[non-string content]",
                                    toolCalls: message instanceof AIMessage
                                        ? message.tool_calls?.map((call) => call.name)
                                        : [],
                                })),
                            );

                            for (const message of messages) {
                                if (!isAIMessage(message)) {
                                    continue;
                                }

                                if (message.tool_calls?.length) {
                                    for (const call of message.tool_calls) {
                                        controller.enqueue(encode({ type: "tool_call", tool: call.name, args: call.args }))
                                    }
                                }
                                if (typeof message.content === "string" && message.content) {
                                    // Only capture an AI message with no tool calls as a final-answer candidate.
                                    if (message.tool_calls?.length === 0) {
                                        assistantResponse = message.content;
                                    }

                                    controller.enqueue(
                                        encode({ type: "message", content: message.content })
                                    );
                                }
                            }
                        }
                        if (chunk.tools) {
                            for (const message of chunk.tools.messages) {
                                controller.enqueue(encode({ type: "tool_result", tool: message.name ?? "unknown", result: message.content }))
                            }
                        }
                    }
                    console.log(
                        "AGENT STREAM DURATION (seconds):",
                        ((Date.now() - agentStartedAt) / 1000).toFixed(1),
                    );


                    if (!assistantResponse.trim()) {
                        throw new Error("Agent completed without a final assistant response");
                    }

                    // 1. Validate the completed project.
                    controller.enqueue(
                        encode({ type: "message", content: "Validating project..." }),
                    );
                    const validationStartedAt = Date.now();

                    console.log(
                        "VALIDATION DURATION (seconds):",
                        ((Date.now() - validationStartedAt) / 1000).toFixed(1),
                    );


                    // 3. Save the assistant response to MongoDB.

                    await MessageModel.create({
                        chat: chatId,
                        role: "assistant",
                        message: assistantResponse,

                    })
                    // 4. Mark completion only after persistence succeeds.
                    const doneEvent: { type: "done" } & Partial<Pick<UsageMetadata, "input_tokens" | "output_tokens" | "total_tokens">> = {
                        type: "done",
                    };
                    if (usage) {
                        doneEvent.input_tokens = usage.input_tokens;
                        doneEvent.output_tokens = usage.output_tokens;
                        doneEvent.total_tokens = usage.total_tokens;
                    }
                    controller.enqueue(encode(doneEvent));
                    controller.close();

                } catch (error) {

                    console.error("[SaadAgent error]", error);
                    console.error(
                        "[SaadAgent stack]",
                        error instanceof Error ? error.stack : String(error),
                    );

                    controller.enqueue(encode({
                        type: "error",
                        message: error instanceof Error ? error.message : "Unknown agent error"
                    }))
                    controller.close();

                }
            }
        })

        return new Response(readable, {
            headers: {
                "Content-Type": "application/x-ndjson",
                "Cache-Control": "no-cache",
            },
        });
    } catch (error) {
        console.error("[Project Edit API]", error);

        return NextResponse.json(
            { error: "Unable to edit project" },
            { status: 500 },
        );
    }
}
