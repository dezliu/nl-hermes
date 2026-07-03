import { DEFAULT_WORKFLOW_LIMITS, isRagScoreAcceptable, type WorkflowGraphState } from '@hermes/workflow';

/** 生成成功且值得入候选池：RAG 分达工作流门槛，且库内无已匹配相似模板 */
export function shouldCreateTemplateCandidate(state: Pick<
  WorkflowGraphState,
  'ragScore' | 'minRagScore' | 'schemaContext' | 'templateMatches'
>): boolean {
  if (!isRagScoreAcceptable(state.ragScore, state.minRagScore, state.schemaContext)) {
    return false;
  }
  if (state.templateMatches.length > 0) {
    return false;
  }
  return true;
}

export { DEFAULT_WORKFLOW_LIMITS };
