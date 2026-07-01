/**
 * Next.js runs `register()` once when the server process starts. We use it to
 * schedule the expired-build cleanup so old .ipa/.apk files don't pile up on
 * disk (or the NAS). Runs on boot, then hourly.
 */
export async function register() {
  // Only in the Node.js server runtime (skip edge/build passes).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { sweepExpired } = await import("./lib/cleanup");

  const run = async () => {
    try {
      const removed = await sweepExpired();
      if (removed > 0) console.log(`[cleanup] removed ${removed} expired build(s)`);
    } catch (err) {
      console.error("[cleanup] sweep failed", err);
    }
  };

  void run();
  setInterval(() => void run(), 60 * 60 * 1000).unref();
}
