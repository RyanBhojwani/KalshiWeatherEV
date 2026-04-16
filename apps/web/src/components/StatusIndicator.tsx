"use client";

import { usePollStatus } from "@/hooks/usePollStatus";

export function StatusIndicator() {
  const { lastPoll, isHealthy } = usePollStatus();

  const statusColor = isHealthy
    ? "bg-green-500"
    : lastPoll
      ? "bg-yellow-500"
      : "bg-gray-400";

  const statusText = isHealthy
    ? "Live"
    : lastPoll?.status === "error"
      ? "Error"
      : lastPoll
        ? "Stale"
        : "No data";

  const lastUpdated = lastPoll?.completed_at
    ? new Date(lastPoll.completed_at).toLocaleTimeString()
    : "Never";

  return (
    <div className="flex items-center gap-2 text-sm text-foreground/60">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusColor}`} />
      <span>{statusText}</span>
      <span className="text-foreground/40">|</span>
      <span>Last update: {lastUpdated}</span>
      {lastPoll?.duration_ms && (
        <span className="text-foreground/40">({lastPoll.duration_ms}ms)</span>
      )}
    </div>
  );
}
