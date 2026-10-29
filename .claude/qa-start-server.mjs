// Starts the already-built app (`next start`, port 3100) against the local QA
// test database only — for inspecting a production build by hand after a sweep.
// qa/target-db.mjs refuses Aiven; the variables set here win over .env.
import { spawn } from "node:child_process";
import { qaDatabaseUrl } from "../qa/target-db.mjs";

const child = spawn("npx", ["next", "start", "--port", "3100"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    DATABASE_URL: qaDatabaseUrl(),
    DATABASE_CA_CERT: "",
    BLOB_READ_WRITE_TOKEN: "",
    MAIL_SUPPRESS_DOMAINS: "qa-run.ac.th,example.invalid",
    CRON_SECRET: "qa-cron-secret",
    AUTH_TRUST_HOST: "true",
  },
});
child.on("exit", (code) => process.exit(code ?? 0));
