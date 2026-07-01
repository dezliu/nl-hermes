import { createServiceApp } from '@hermes/shared';

const PORT = Number(process.env.PORT ?? 4030);
const app = createServiceApp('report-service');

app.post("/v1/reports/generate", (_req, res) => { res.json({ status: "stub" }); });

app.listen(PORT, () => {
  console.log(`[report-service] listening on :${PORT}`);
});
