import { useCallback, useEffect, useState } from "react";

// Each stage owns its request. Inspecting a source or editing chart options must
// not cancel an otherwise current merge/analysis, nor accept an older response.
export default function useDataPreview({ api, path, fingerprint, ready, upstream = null }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const retry = useCallback(() => setRevision((previous) => previous + 1), []);
  const current = result?.path === path && result?.fingerprint === fingerprint &&
    result?.upstream === upstream && result?.revision === revision;

  useEffect(() => {
    if (!ready) {
      setResult(null);
      return undefined;
    }
    const controller = new AbortController();
    let cancelled = false;
    const identity = { path, fingerprint, upstream, revision };
    setResult({ ...identity, status: "pending" });
    // Coalesce typing/rapid dropdown changes before executing plugin code.
    const timer = setTimeout(async () => {
      try {
        const response = await api.post(path, JSON.parse(fingerprint), {
          signal: controller.signal,
        });
        if (!cancelled) {
          setResult({ ...identity, status: "success", data: response.data.data });
        }
      } catch (error) {
        if (!cancelled) {
          setResult({
            ...identity,
            status: "error",
            error: error?.response?.data?.message || error?.message ||
              "Could not update the data preview. Review your selections and try again.",
          });
        }
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [api, path, fingerprint, ready, upstream, revision]);

  // Invalidate synchronously, before the effect runs, so Next/Save can never use
  // a preview from an older configuration or upstream result.
  return {
    data: ready && current && result.status === "success" ? result.data : null,
    error: ready && current && result.status === "error" ? result.error : "",
    loading: Boolean(ready && (!current || result.status === "pending")),
    retry,
  };
}
