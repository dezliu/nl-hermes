import { createMetadataApp } from './app.js';

const PORT = Number(process.env.PORT ?? 4050);
const app = createMetadataApp();

app.listen(PORT, () => {
  console.log(`[metadata-service] listening on :${PORT}`);
});

export { createMetadataApp };
