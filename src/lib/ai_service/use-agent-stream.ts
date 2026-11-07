// hooks/use-agent-stream.ts
import { useState, useCallback } from "react";
import { AgentEvent } from "./events";

export function useAgentStream() {
  const [loading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);

  const runAgentStream = useCallback(
    async ( chatId: string, prompt: string) => {
      setIsLoading(true);
      setError(null);
      setEvents([]);
      let completed = false;
      let streamFailed = false;

      try {
        const response = await fetch(`/api/chat/${chatId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt}),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to run agent");
        }

        if (!response.body) {
          throw new Error("Response body is missing");
        }

        // Pipe response through TextDecoderStream for clean text chunks
        const reader = response.body
          .pipeThrough(new TextDecoderStream())
          .getReader();

        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += value;
          const lines = buffer.split("\n");

          // Keep the last partial line in the buffer if incomplete
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const event: AgentEvent = JSON.parse(line);

              // Update local state live as chunks arrive
              setEvents((prev) => [...prev, event]);

              if (event.type === "error") {
                streamFailed = true;
                setError(event.message);
              } else if (event.type === "done") {
                completed = true;
              }
            } catch (parseError) {
              console.error("Failed to parse NDJSON line:", line, parseError);
            }
          }
        }
        if (!completed || streamFailed) {
          setError((prev) => prev ?? "The agent stream ended without completing.");
          return false;
        }

        return true;
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred"
        );
        return false;
      } finally {
        setIsLoading(false);
      }
    }, []);

  return { runAgentStream, events, loading, error };
}