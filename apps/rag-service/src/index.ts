import { createRagApp } from './app.js';

const PORT = Number(process.env.PORT ?? 4020);
const app = createRagApp();

app.listen(PORT, () => {
  console.log(`[rag-service] listening on :${PORT}`);
});

export { createRagApp };
