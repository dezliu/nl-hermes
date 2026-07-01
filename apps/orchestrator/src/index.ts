import { createServiceApp } from '@hermes/shared';

const PORT = Number(process.env.PORT ?? 4010);
const app = createServiceApp('orchestrator');

app.post("/v1/chat/stream", (_req, res) => { res.setHeader("Content-Type", "text/event-stream"); res.write("data: {\"phase\":\"understanding\"}\n\n"); res.end(); });

app.listen(PORT, () => {
  console.log(`[orchestrator] listening on :${PORT}`);
});
