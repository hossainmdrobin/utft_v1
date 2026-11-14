export type AgentEvent =
  | { type: "thinking" }
  | { type: "tool_call"; tool: string; args: unknown }
  | { type: "tool_result"; tool: string; result: unknown }
  | { type: "message"; content: string }
  | { type: "done"; input_tokens?: number; output_tokens?: number; total_tokens?: number }
  | { type: "error", message: string }
  | {
    type: "process_output";
    pid: number;
    stream: "stdout" | "stderr";
    data: string;
  }
  | { type: "preview"; url: string; pid: number }