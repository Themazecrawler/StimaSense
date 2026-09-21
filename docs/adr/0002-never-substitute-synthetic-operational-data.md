# Never substitute synthetic operational data

Production builds will represent unavailable weather, notices, reports, and predictions explicitly instead of substituting mock records, default coordinates, heuristics, or random values. This sacrifices a superficially populated interface in degraded conditions, but preserves user trust and keeps demonstrations isolated behind a visibly labelled development-only mode.
