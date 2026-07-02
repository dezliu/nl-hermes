import { createOrchestratorApp } from './app.js';

const PORT = Number(process.env.PORT ?? 4010);

createOrchestratorApp()
  .then(({ app }) => {
    app.listen(PORT, () => {
      console.log(`[orchestrator] listening on :${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[orchestrator] failed to start', err);
    process.exit(1);
  });
