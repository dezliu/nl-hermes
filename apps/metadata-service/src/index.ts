import { createServiceApp } from '@hermes/shared';

const PORT = Number(process.env.PORT ?? 4050);
const app = createServiceApp('metadata-service');



app.listen(PORT, () => {
  console.log(`[metadata-service] listening on :${PORT}`);
});
