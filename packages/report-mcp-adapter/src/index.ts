#!/usr/bin/env node
import { createReportMcpApp } from './server.js';

const port = Number(process.env.REPORT_MCP_PORT ?? 4031);
const app = createReportMcpApp({ reportBaseUrl: process.env.REPORT_SERVICE_URL });

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`report-mcp-adapter listening on :${port}`);
});
