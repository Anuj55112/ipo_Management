// Allotment Auto-Check Trigger Script
// This script triggers the Next.js server-side auto-check endpoint to verify and sync pending allotments.

const PORT = process.env.PORT || 3000;
const SYNC_URL = `http://localhost:${PORT}/api/allotments/auto-check`;

async function triggerSync() {
  console.log(`[${new Date().toISOString()}] Triggering Allotment Auto-Check Sync on ${SYNC_URL}...`);
  try {
    const res = await fetch(SYNC_URL, { method: "POST" });
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }
    const json = await res.json();
    console.log("Sync Report:", JSON.stringify(json, null, 2));
  } catch (err: any) {
    console.error("Error triggering auto-check sync:", err.message || err);
  }
}

triggerSync();
