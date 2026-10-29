import { NextResponse } from "next/server";

// Where browsers send Content-Security-Policy violations. The policy is
// enforced (src/proxy.ts, since 29 Oct 2026), so each report is something the
// browser actually blocked — a page the policy breaks shows up here first.
// Each report becomes one line in the Vercel function logs, searchable by
// "[csp]".
//
// Open to anyone, as report endpoints have to be: it writes nothing but a log
// line, reads at most MAX_BYTES, and logs only the handful of fields that say
// what was blocked and where, cut short.
const MAX_BYTES = 16 * 1024;
const MAX_REPORTS = 10;

type Violation = Record<string, unknown>;

const field = (v: Violation, ...keys: string[]) => {
  for (const key of keys) {
    const value = v[key];
    if (typeof value === "string" || typeof value === "number") return String(value).slice(0, 200);
  }
  return "-";
};

/**
 * Both formats browsers send: the older report-uri body
 * ({"csp-report": {...}}, kebab-case) and the Reporting API's array of
 * {type: "csp-violation", body: {...}} (camelCase).
 */
function violations(payload: unknown): Violation[] {
  if (Array.isArray(payload)) {
    return payload
      .filter((r) => r && typeof r === "object" && (r as Violation).type === "csp-violation")
      .map((r) => ((r as Violation).body ?? {}) as Violation);
  }
  if (payload && typeof payload === "object" && "csp-report" in payload) {
    return [(payload as { "csp-report": Violation })["csp-report"] ?? {}];
  }
  return [];
}

export async function POST(request: Request) {
  try {
    const text = (await request.text()).slice(0, MAX_BYTES);
    for (const v of violations(JSON.parse(text)).slice(0, MAX_REPORTS)) {
      console.warn(
        `[csp] ${field(v, "effectiveDirective", "effective-directive", "violatedDirective", "violated-directive")}` +
          ` blocked=${field(v, "blockedURL", "blocked-uri")}` +
          ` page=${field(v, "documentURL", "document-uri")}` +
          ` at=${field(v, "sourceFile", "source-file")}:${field(v, "lineNumber", "line-number")}`
      );
    }
  } catch {
    // A body that is not JSON is not a report; nothing to log.
  }
  return new NextResponse(null, { status: 204 });
}
