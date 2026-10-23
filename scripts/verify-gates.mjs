const app = process.env.APP_URL || "http://localhost:3000";
async function post(path, body, headers = {}) {
  const res = await fetch(`${app}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return res.status;
}

const previewNoAuth = await post("/api/chat", {
  chatbotId: "00000000-0000-0000-0000-000000000000",
  sessionId: "s1",
  message: "hi",
});
const missing = await post("/api/chat", {});
const publicDraftMissing = await post("/api/chat", { publicId: "does-not-exist", sessionId: "s1", message: "hi" });
const ingestNoSecret = await post("/api/ingest", { sourceId: "x" });

console.log("chat preview no-auth (expect 401):", previewNoAuth);
console.log("chat missing fields (expect 400):", missing);
console.log("chat unknown publicId (expect 404):", publicDraftMissing);
console.log("ingest no secret (expect 401):", ingestNoSecret);

const ok = previewNoAuth === 401 && missing === 400 && publicDraftMissing === 404 && ingestNoSecret === 401;
console.log(ok ? "PASS: API gates correct" : "FAIL");
process.exit(ok ? 0 : 1);
