export type AgentEvent =
    | {
        type: "thinking";
    }
    | {
        type: "tool_call";
        tool: string;
        args: unknown;
    }
    | {
        type: "tool_result";
        tool: string;
        result: unknown;
    }
    | {
        type: "message";
        content: string;
    }
    | {
        type: "done";
    }
    | {
        type: "error";
        message: string;
    };