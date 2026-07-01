import { createServiceApp } from '@hermes/shared';

const PORT = Number(process.env.PORT ?? 4020);
const app = createServiceApp('rag-service');

app.post("/v1/retrieve", (_req, res) => { res.json({ results: [], message: "RAG stub" }); });

app.listen(PORT, () => {
  console.log(`[rag-service] listening on :${PORT}`);
});
