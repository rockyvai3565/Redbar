import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

window.addEventListener("load", async () => {
  const root = document.getElementById("app");
  const { bootRedbarUI } = await import("./Redbar-ui.js");

  let isMini = false;
  try { isMini = await sdk.isInMiniApp(); } catch { isMini = false; }

  const ui = bootRedbarUI({ root, onReadyText: "ready ✓" });
  ui.setEnv(isMini);

  try { await sdk.actions.ready(); } catch {}
});