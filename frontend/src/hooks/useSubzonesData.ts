/**
 * Single source of truth loader for subzones data
 * Part B: Fix races, ordering, and expressions
 */

import { useEffect, useRef, useState } from "react";
import * as SubzoneAPI from "@/services/subzones";
import type { FeatureCollection } from "@/services/subzones";

type State = {
  breaks: number[] | null;
  fc: FeatureCollection | null;
  loading: boolean;
  error?: string;
};

export function useSubzonesData(opts: { fields?: string[]; simplify?: number }) {
  const [state, setState] = useState<State>({ breaks: null, fc: null, loading: true });
  const runId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const id = ++runId.current;

    (async () => {
      setState(s => ({ ...s, loading: true, error: undefined }));
      
      try {
        const [q, fc] = await Promise.all([
          SubzoneAPI.getQuantiles(5),
          SubzoneAPI.geo({ fields: opts.fields, simplify: opts.simplify })
        ]);
        
        if (cancelled || id !== runId.current) return;

        // Defensive checks
        if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
          throw new Error("Invalid GeoJSON");
        }
        
        const populated = fc.features.filter(
          f => typeof f?.properties?.populationTotal === "number"
        ).length;
        
        console.info(
          "[data] fc=%d populated=%d breaks=%o",
          fc.features.length,
          populated,
          q.breaks
        );
        
        setState({ breaks: q.breaks, fc, loading: false });
      } catch (e) {
        if (!cancelled) {
          console.error("[data] load error:", e);
          setState({ breaks: null, fc: null, loading: false, error: String(e) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [opts.fields?.join(","), opts.simplify]);

  return state;
}

