import { useCallback, useEffect, useRef, useState } from "react";

// Persist first: the server executes the owned draft, never a client-supplied graph.
export default function useAdaptationPreview({ api, draft, stage, fingerprint, ready, upstream = null }) {
  const session = useRef(draft);
  session.current = draft;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const current = result?.fingerprint === fingerprint && result?.upstream === upstream && result?.attempt === attempt;
  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    const controller = new AbortController();
    const identity = { fingerprint, upstream, attempt };
    setResult({ ...identity, status: "pending" });
    const timer = setTimeout(async () => {
      try {
        const saved = await session.current.flush();
        if (cancelled) return;
        if (!saved?.id || saved.revision == null) throw new Error("Save this draft before generating its preview.");
        const response = (await api.post(`v1/indicators/drafts/${encodeURIComponent(saved.id)}/adaptation-preview`,
          { revision: saved.revision, stage }, { signal: controller.signal })).data.data;
        if (response.status !== "READY") throw new Error(response.message || "Review your selections before previewing.");
        if (!cancelled) setResult({ ...identity, status: "success", data: response.data });
      } catch (error) {
        if (!cancelled) setResult({ ...identity, status: "error", error: error?.response?.data?.message || error.message || "Could not update the preview." });
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [api, stage, fingerprint, ready, upstream, attempt]);
  return { data: ready && current && result.status === "success" ? result.data : null,
    error: ready && current && result.status === "error" ? result.error : "",
    loading: Boolean(ready && (!current || result.status === "pending")), retry };
}
