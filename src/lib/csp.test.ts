import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, newNonce } from "@/lib/csp";

const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

describe("content security policy", () => {
  it("runs only scripts carrying this response's nonce — no 'unsafe-inline' for scripts", () => {
    const script = directive(contentSecurityPolicy("abc123", false), "script-src");
    expect(script).toContain("'nonce-abc123'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
  });

  it("allows eval and the HMR socket only in development", () => {
    const dev = contentSecurityPolicy("n", true);
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(dev, "connect-src")).toContain("ws:");
    expect(directive(contentSecurityPolicy("n", false), "connect-src")).toBe("connect-src 'self'");
  });

  it("keeps what the app needs: photos from the Blob store, plugins off, reports on", () => {
    const csp = contentSecurityPolicy("n", false);
    expect(directive(csp, "img-src")).toContain("https://*.public.blob.vercel-storage.com");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
    expect(csp).toContain("report-uri /api/csp-report");
  });

  it("gives every response a different nonce", () => {
    const nonces = new Set(Array.from({ length: 50 }, newNonce));
    expect(nonces.size).toBe(50);
  });
});
