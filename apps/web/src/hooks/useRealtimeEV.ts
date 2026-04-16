"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import type { EVCalculationRow, CityRow } from "@kalshi-ev/shared";

export interface EVWithCity extends EVCalculationRow {
  cities: CityRow;
}

export function useRealtimeEV() {
  const [data, setData] = useState<EVWithCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const { data: rows, error: fetchError } = await getSupabase()
      .from("ev_calculations")
      .select("*, cities(*)")
      .order("best_edge", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setData((rows as EVWithCity[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();

    const sb = getSupabase();
    const channel = sb
      .channel("ev-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ev_calculations",
        },
        () => {
          // Re-fetch all data on any change (simpler than merging)
          fetchData();
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [fetchData]);

  return { data, loading, error };
}
