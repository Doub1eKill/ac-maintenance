// Types for psql.mjs, which stays JavaScript so plain node can run
// qa/baseline.mjs without a build step while the TypeScript specs still get
// checked against it.
export declare function resolvePsql(): string;
export declare function runPsql(url: string, query: string): (string | null)[][];
