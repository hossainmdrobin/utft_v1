import { AgentEvent } from "@/lib/ai_service/events";
import { BrainCircuit } from "lucide-react";

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case "thinking":
      return "🤔";
    case "tool_call":
      return "🔧";
    case "tool_result":
      return "✅";
    case "message":
      return "💬";
    case "done":
      return "✓";
    case "error":
      return "❌";
    case "process_output":
      return "⌨️";
    default:
      return "•";
  }
}

function EventBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    thinking: "bg-amber-500/15 text-amber-500",
    tool_call: "bg-[var(--agent-primary-soft)] text-[var(--agent-primary)]",
    tool_result: "bg-[var(--agent-success)]/15 text-[var(--agent-success)]",
    message: "bg-[var(--agent-accent)]/15 text-[var(--agent-accent)]",
    done: "bg-[var(--agent-success)]/15 text-[var(--agent-success)]",
    error: "bg-[var(--agent-error)]/15 text-[var(--agent-error)]",
    process_output: "bg-[var(--agent-bg-sunken)] text-[var(--agent-text-muted)]",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colors[type] || "bg-[var(--agent-bg-sunken)] text-[var(--agent-text-dim)]"
        }`}
    >
      {type.replace("_", " ")}
    </span>
  );
}

export function ChatPanel({ events }: { events: AgentEvent[] }) {
  return (
    <div className="overflow-hidden rounded-xl pb-20 mb-20">

      <div className="space-y-3 overflow-auto p-1">
        {
          events.map(item => (
            <div className="flex item-center ">
              {item.type != 'done' && <span className="animate-pulse"><BrainCircuit /></span>}
              <span className={`mx-2 ${EventBadge({type:item.type})}`}>{item.type}</span>
              <span>{EventIcon({ type: item.type })}</span>
              {item.type=='message' && <div>{item.content}</div>}
            </div>
          ))
        }
      </div>
    </div>
  );
}