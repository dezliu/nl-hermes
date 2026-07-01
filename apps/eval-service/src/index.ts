import { createServiceApp } from '@hermes/shared';

const PORT = Number(process.env.PORT ?? 4040);
const app = createServiceApp('eval-service');



app.listen(PORT, () => {
  console.log(`[eval-service] listening on :${PORT}`);
});
