import { createReportApp } from './app.js';

const PORT = Number(process.env.PORT ?? 4030);
const app = createReportApp();

app.listen(PORT, () => {
  console.log(`[report-service] listening on :${PORT}`);
});

export { createReportApp };
