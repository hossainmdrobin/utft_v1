
import { NextRequest, NextResponse } from "next/server";

import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { connectDB } from "@/integrations/mongodb/connection";
import ChatModel, { ChatDoc } from "@/models/Chat";
import MessageModel, { MessageDoc } from "@/models/Message";
import { AgentEvent } from "@/lib/ai_service/events";
import { agent } from "@/lib/ai_service/mainAgent";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";



export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = {
    params: Promise<{ chatId: string }>;
};

type BodyType = { prompt: string, conversationId: string }

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
        const user = await getCurrentMember(request, ["admin", "president", "director"]);
        if (!user?._id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 },);
        console.log('VALIDATION PROJECT ID')
        // 2. Validate request input.
        const { chatId } = await params;
        if (!/^[a-f\d]{24}$/i.test(chatId))
            return NextResponse.json({ error: "Invalid project ID" }, { status: 400 },);

        const body: BodyType = await request.json();

        if (!body || typeof body !== "object" || !("prompt" in body) || typeof body.prompt !== "string")
            return NextResponse.json({ error: "A prompt is required" }, { status: 400 },);
        console.log("VALIDATING PROMPT")
        const prompt = body.prompt.trim();
        if (!prompt || prompt.length > 10000)
            return NextResponse.json({ error: "Prompt must be 1-10000 characters" }, { status: 400 },);
        console.log('CREATING SANDBOX')


        // SAVING THE MESSAGE PROMPT
        await connectDB();


        const messages = await MessageModel.find({ chat: chatId })
            .limit(10)
            .lean();

        const history: BaseMessage[] = messages.reverse().map((message) => {
            return message.role === "user"
                ? new HumanMessage(message.message)
                : new AIMessage(message.message);
        });

        const agentStartedAt = Date.now();

        const stream = await agent.stream(
            { messages: history } as any,
            {
                streamMode: "updates",
                configurable: {
                    thread_id: `${chatId}`,
                },
            }
        ) as any;
        // THE ASSISTANT MESSAGE VARIABLE
        let assistantResponse = "";
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    controller.enqueue(encode({ type: "thinking" }))
                    for await (const chunk of stream) {
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
                    const result = await ChatModel.updateOne(
                        {
                            _id: chatId,
                        },
                        {
                            $push: {
                                messages: {
                                    role: "assistant",
                                    content: assistantResponse,
                                    createdAt: new Date(),
                                },
                            },
                            $set: { updatedAt: new Date() },
                        },
                    );

                    if (result.matchedCount !== 1) {
                        throw new Error("Conversation was not found during message persistence");
                    }
                    // 4. Mark completion only after persistence succeeds.
                    controller.enqueue(encode({ type: "done" }));
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
