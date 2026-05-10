"use client";

import { useState, useEffect, useCallback } from "react";
import type { Project, Program, Indicator, Organization, BudgetLine, RiskItem } from "@/lib/types";
import { useTenant } from "@/contexts/TenantContext";

interface DataStore {
  projects: Project[];
  programs: Program[];
  indicators: Indicator[];
  organizations: Organization[];
  budgetLines: BudgetLine[];
  risks: RiskItem[];
}

export function useData() {
  const { apiFetch, tenantId, ready } = useTenant();
  const [data, setData] = useState<DataStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/data");
      if (!res.ok) throw new Error("Failed to load data");
      const store = await res.json();
      setData({
        projects: store.projects ?? [],
        programs: store.programs ?? [],
        indicators: store.indicators ?? [],
        organizations: store.organizations ?? [],
        budgetLines: store.budgetLines ?? [],
        risks: store.risks ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!ready) return;
    refetch();
  }, [refetch, ready, tenantId]);

  return { data, loading: loading || !ready, error, refetch };
}
