import { createEvalApp } from './app.js';

const PORT = Number(process.env.PORT ?? 4040);
const app = createEvalApp();

const server = app.listen(PORT, () => {
  console.log(`[eval-service] listening on :${PORT} (eval API enabled)`);
  // #region agent log
  fetch('http://127.0.0.1:7876/ingest/a10af35d-fe0f-499b-a73b-d9b447f06006', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'd26445' },
    body: JSON.stringify({
      sessionId: 'd26445',
      runId: 'startup',
      hypothesisId: 'B',
      location: 'eval-service/index.ts:listen',
      message: 'eval-service started with eval API',
      data: { port: PORT, evalApi: true },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[eval-service] 端口 ${PORT} 已被占用，新 eval API 无法启动。请先释放端口：lsof -ti :${PORT} | xargs kill -9`,
    );
    // #region agent log
    fetch('http://127.0.0.1:7876/ingest/a10af35d-fe0f-499b-a73b-d9b447f06006', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'd26445' },
      body: JSON.stringify({
        sessionId: 'd26445',
        runId: 'startup',
        hypothesisId: 'A',
        location: 'eval-service/index.ts:EADDRINUSE',
        message: 'port conflict prevents eval API from starting',
        data: { port: PORT, code: err.code },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }
  throw err;
});

export { createEvalApp };
