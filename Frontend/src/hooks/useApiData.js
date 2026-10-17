import { useCallback, useEffect, useRef, useState } from "react";

// Loads data when the component mounts (or deps change).
// const { data, loading, error, reload, setData } = useApiData(() => api.getThing(id), [id]);
export function useApiData(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcherRef.current();
      if (id === requestId.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (id === requestId.current) setState({ data: null, loading: false, error });
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      requestId.current += 1; // ignore results from stale requests
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback((updater) => {
    setState((prev) => ({
      ...prev,
      data: typeof updater === "function" ? updater(prev.data) : updater,
    }));
  }, []);

  return { ...state, reload: load, setData };
}
