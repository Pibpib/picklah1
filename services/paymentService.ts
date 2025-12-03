// services/paymentService.ts
import { auth } from "./firebaseConfig";

// ⚠️ Replace with your deployed Functions base
// e.g. "https://australia-southeast1-picklah-cb437.cloudfunctions.net"
const BASE = "https://<region>-<your-project>.cloudfunctions.net";

async function authedPost(path: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("not_signed_in");
  const token = await user.getIdToken(/* forceRefresh? false */);

  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  return json;
}

export async function requestTestUpgrade() {
  // Calls your Cloud Function `testUpgrade`
  return authedPost("testUpgrade");
}

export async function requestTestDowngrade() {
  // Calls your Cloud Function `testDowngrade`
  return authedPost("testDowngrade");
}
