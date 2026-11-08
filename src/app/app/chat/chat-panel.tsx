import { AgentEvent } from "@/lib/ai_service/events";

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
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        colors[type] || "bg-[var(--agent-bg-sunken)] text-[var(--agent-text-dim)]"
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
        {events.length === 0 ? (
          <div className="py-8 text-center">
            {/* <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--agent-bg-sunken)]">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--agent-text-dim)]"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div> */}
            {/* <p className="text-sm text-[var(--agent-text-dim)]">
              No events yet. Run the agent to see activity.
            </p> */}
          </div>
        ) : (
          events.map((event, index) => {
            if (event.type === "thinking") {
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-[var(--agent-text-muted)]"
                >
                  <span>🤔</span>
                  <span>Thinking...</span>
                </div>
              );
            }

            if (event.type === "process_output") {
              return (
                <div>
                  <span>Processing Output</span>
                </div>
                // <pre
                //   key={index}
                //   className="overflow-x-auto rounded-lg bg-[var(--agent-bg-sunken)] p-3 font-mono text-xs text-[var(--agent-text)]"
                // >
                //   {event.data}
                // </pre>
              );
            }

            if (event.type === "tool_call") {
              return (
                <div
                  key={index}
                  className="rounded-lg border border-[var(--agent-border)] bg-[var(--agent-bg)] p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span>🔧</span>
                    <span className="font-semibold text-[var(--agent-text)]">
                      {event.tool}
                    </span>
                    <EventBadge type="tool_call" />
                  </div>
                  {/* <pre className="overflow-x-auto text-xs text-[var(--agent-text-muted)]">
                    {JSON.stringify(event.args, null, 2)}
                  </pre> */}
                </div>
              );
            }

            if (event.type === "tool_result") {
              return (
                <div
                  key={index}
                  className="rounded-lg border border-[var(--agent-border)] bg-[var(--agent-bg)] p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span>✅</span>
                    <span className="font-semibold text-[var(--agent-text)]">
                      {event.tool}
                    </span>
                    <EventBadge type="tool_result" />
                  </div>
                  <pre className="overflow-x-auto text-xs text-[var(--agent-text-muted)]">
                    {typeof event.result === "string"
                      ? event.result
                      : JSON.stringify(event.result, null, 2)}
                  </pre>
                </div>
              );
            }

            if (event.type === "message") {
              return (
                <div
                  key={index}
                  className="rounded-lg bg-[var(--agent-bg-sunken)] p-3 text-sm text-[var(--agent-text)]"
                >
                  {event.content}
                </div>
              );
            }

            if (event.type === "done") {
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm font-medium text-[var(--agent-success)]"
                >
                  <span>✓</span>
                  <span>Done</span>
                </div>
              );
            }

            if (event.type === "error") {
              return (
                <div
                  key={index}
                  className="rounded-lg border border-[var(--agent-error)]/40 bg-[var(--agent-error)]/10 p-3 text-sm text-[var(--agent-error)]"
                >
                  <div className="flex items-center gap-2">
                    <span>❌</span>
                    <span className="font-semibold">Error</span>
                  </div>
                  <p className="mt-1">{event.message}</p>
                </div>
              );
            }

            return null;
          })
        )}
      </div>
    </div>
  );
}