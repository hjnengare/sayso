/**
 * Ensures browser globals like `self` exist before running `next build`
 * to prevent third-party packages from crashing during SSR bundling.
 */

if (typeof globalThis.self === "undefined") {
  globalThis.self = globalThis;
}

const { spawn } = require("child_process");
const path = require("path");

const isWindows = process.platform === "win32";
const command = isWindows ? "npx.cmd" : "npx";
const args = ["next", "build"];
const polyfillPath = path.resolve(__dirname, "self-polyfill.js").replace(/\\/g, "/");
const existingNodeOptions = process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : "";
const nodeOptions = `${existingNodeOptions}--require ${polyfillPath}`;
const isCi = process.env.CI === "true" || !!process.env.VERCEL;
const buildEnv = {
  ...process.env,
  NODE_OPTIONS: nodeOptions,
};

// Local convenience: keep production guard strict in CI/deploy, but avoid
// forcing every local build command to export PHONE_OTP_MODE manually.
if (!buildEnv.PHONE_OTP_MODE && !isCi) {
  buildEnv.PHONE_OTP_MODE = "twilio";
  console.warn('[build] PHONE_OTP_MODE not set; defaulting to "twilio" for local build.');
}

const child = spawn(command, args, {
  stdio: "inherit",
  env: buildEnv,
  shell: isWindows,
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});

