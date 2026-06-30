import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import { requestAdminUsage } from "./manage-apis";

// Index a usage list ([{ id, indicatorCount, uniqueUserCount }]) by id for O(1) lookup.
const indexById = (list) => {
  const map = {};
  (Array.isArray(list) ? list : []).forEach((entry) => {
    if (entry && entry.id != null) {
      map[entry.id] = entry;
    }
  });
  return map;
};

/**
 * Loads admin usage counts (GET /v1/admin/usage) once and returns the slice for
 * one category — "visualizationLibraries" | "visualizationTypes" |
 * "analyticsMethods" — indexed by item id. Best-effort: a failure sets
 * status="error" so the caller can show "Usage unavailable" without blocking
 * the page. Returns { status: "loading"|"ready"|"error", byId }.
 */
export const useAdminUsage = (category) => {
  const { api } = useContext(AuthContext);
  const [status, setStatus] = useState("loading");
  const [byId, setById] = useState({});

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    requestAdminUsage(api)
      .then(({ data }) => {
        if (cancelled) return;
        setById(indexById(data?.[category]));
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load admin usage", error);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [api, category]);

  return { status, byId };
};
