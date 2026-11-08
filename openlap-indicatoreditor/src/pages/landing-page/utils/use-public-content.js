import { useCallback, useEffect, useState } from "react";
import { requestPublicContent } from "./public-content-api.js";

export default function usePublicContent(kind, page = 0, size = 6) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    status: "loading",
    items: [],
    total: 0,
  });
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", items: [], total: 0 });
    requestPublicContent(kind, page, size, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({
            status: "ready",
            items: data.content,
            total: data.totalElements,
          });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({ status: "error", items: [], total: 0 });
      });
    return () => controller.abort();
  }, [kind, page, size, attempt]);
  return { ...state, retry };
}
