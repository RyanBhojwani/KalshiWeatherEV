"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import type { PollLogRow } from "@kalshi-ev/shared";

export function usePollStatus() {
  const [lastPoll, setLastPoll] = useState<PollLogRow | null>(null);

  const fetchLatest = useCallback(async () => {
    const { data } = await getSupabase()
      .from("poll_log")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (data) setLastPoll(data as PollLogRow);
  }, []);

  useEffect(() => {
    fetchLatest();

    const sb = getSupabase();
    const channel = sb
      .channel("poll-status")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poll_log",
        },
        () => fetchLatest()
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [fetchLatest]);

  const isHealthy =
    lastPoll?.status === "success" &&
    lastPoll?.completed_at &&
    Date.now() - new Date(lastPoll.completed_at).getTime() < 10 * 60 * 1000;

  return { lastPoll, isHealthy };
}
