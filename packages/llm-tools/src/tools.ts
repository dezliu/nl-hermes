import type { RetrieveRequest, RetrieveResponse } from '@hermes/contracts';
import type { RagClient, ReportClient } from './clients.js';
import { TOOL_DEFINITIONS } from './registry.js';

export type ToolRuntimeContext = {
  rag: RagClient;
  report: ReportClient;
  mode: 'sql' | 'report';
};

export async function executeRetrieveTool(
  name: 'retrieve_metadata' | 'retrieve_business_knowledge' | 'retrieve_templates',
  args: Record<string, unknown>,
  ctx: ToolRuntimeContext,
): Promise<RetrieveResponse> {
  const collection =
    name === 'retrieve_metadata' ? 'metadata' : name === 'retrieve_business_knowledge' ? 'business' : 'templates';
  const req: RetrieveRequest = {
    query: String(args.query ?? ''),
    collection,
    mode: ctx.mode,
    topK: typeof args.topK === 'number' ? args.topK : undefined,
  };
  return ctx.rag.retrieve(req);
}

export function toolsForNode(nodeName: string) {
  return TOOL_DEFINITIONS.filter((t) => t.bindNodes.includes(nodeName));
}
