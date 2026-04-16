"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import type { EVCalculationRow, CityRow, WeatherForecastRow } from "@kalshi-ev/shared";

export interface CityDetailData {
  city: CityRow | null;
  evCalculations: EVCalculationRow[];
  forecasts: WeatherForecastRow[];
}

export function useRealtimeCityData(slug: string) {
  const [data, setData] = useState<CityDetailData>({
    city: null,
    evCalculations: [],
    forecasts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const sb = getSupabase();

    const { data: cityData, error: cityError } = await sb
      .from("cities")
      .select("*")
      .eq("slug", slug)
      .single();

    if (cityError || !cityData) {
      setError(cityError?.message || "City not found");
      setLoading(false);
      return;
    }

    const city = cityData as CityRow;

    const [evResult, forecastResult] = await Promise.all([
      sb
        .from("ev_calculations")
        .select("*")
        .eq("city_id", city.id)
        .order("event_date", { ascending: true })
        .order("floor_strike", { ascending: true }),
      sb
        .from("weather_forecasts")
        .select("*")
        .eq("city_id", city.id)
        .eq("source", "open_meteo")
        .order("forecast_date", { ascending: true }),
    ]);

    setData({
      city,
      evCalculations: (evResult.data as EVCalculationRow[]) || [],
      forecasts: (forecastResult.data as WeatherForecastRow[]) || [],
    });
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchData();

    const sb = getSupabase();
    const channel = sb
      .channel(`city-${slug}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ev_calculations",
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [slug, fetchData]);

  return { ...data, loading, error };
}
