import { MemorySaver } from '@langchain/langgraph';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { BaseCheckpointSaver } from '@langchain/langgraph';
import type { WorkflowGraphState } from './state.js';
import type { WorkflowDeps } from './types.js';
import {
  analyzeReportNode,
  clarifyNode,
  composeSpecNode,
  directAnswerNode,
  executeReportNode,
  generateReportNode,
  generateSqlNode,
  groundingCheckNode,
  intentClassifyNode,
  loadContextNode,
  ragPrepareNode,
  ragQualityGateNode,
  ragRetrieveNode,
  refuseNode,
  renderArtifactNode,
  routeAfterExecute,
  routeAfterSummarize,
  routeAfterGrounding,
  routeAfterIntent,
  routeAfterQualityGate,
  routeAfterSecurity,
  routeAfterValidate,
  securityGuardNode,
  streamOutputNode,
  summarizeResultNode,
  templateMatchNode,
  validateResultNode,
} from './nodes.js';

function mergeState(current: WorkflowGraphState, patch: Partial<WorkflowGraphState>): WorkflowGraphState {
  return { ...current, ...patch };
}

const WorkflowAnnotation = Annotation.Root({
  state: Annotation<WorkflowGraphState>,
});

type GraphUpdate = { state: WorkflowGraphState };

function wrap(handler: (s: WorkflowGraphState, d: WorkflowDeps) => Promise<Partial<WorkflowGraphState>>) {
  return async (input: GraphUpdate, config: { configurable?: { deps?: WorkflowDeps } }): Promise<GraphUpdate> => {
    const deps = config.configurable?.deps;
    if (!deps) throw new Error('workflow deps missing');
    const patch = await handler(input.state, deps);
    return { state: mergeState(input.state, patch) };
  };
}

export function buildWorkflowGraph(_deps: WorkflowDeps, checkpointer?: BaseCheckpointSaver) {
  const graph = new StateGraph(WorkflowAnnotation)
    .addNode('security_guard', wrap(securityGuardNode))
    .addNode('load_context', wrap(loadContextNode))
    .addNode('template_match', wrap(templateMatchNode))
    .addNode('intent_classify', wrap(intentClassifyNode))
    .addNode('rag_prepare', wrap(ragPrepareNode))
    .addNode('rag_retrieve', wrap(ragRetrieveNode))
    .addNode('rag_quality_gate', wrap(ragQualityGateNode))
    .addNode('generate_sql', wrap(generateSqlNode))
    .addNode('generate_report', wrap(generateReportNode))
    .addNode('validate', wrap(validateResultNode))
    .addNode('execute_report', wrap(executeReportNode))
    .addNode('summarize', wrap(summarizeResultNode))
    .addNode('analyze_report', wrap(analyzeReportNode))
    .addNode('compose_spec', wrap(composeSpecNode))
    .addNode('render_artifact', wrap(renderArtifactNode))
    .addNode('grounding_check', wrap(groundingCheckNode))
    .addNode('clarify', wrap(clarifyNode))
    .addNode('direct_answer', wrap(directAnswerNode))
    .addNode('refuse', wrap(refuseNode))
    .addNode('stream_output', wrap(streamOutputNode))
    .addEdge(START, 'security_guard')
    .addConditionalEdges('security_guard', (input: GraphUpdate) => routeAfterSecurity(input.state), {
      refuse: 'refuse',
      load_context: 'load_context',
    })
    .addEdge('load_context', 'template_match')
    .addEdge('template_match', 'intent_classify')
    .addConditionalEdges('intent_classify', (input: GraphUpdate) => routeAfterIntent(input.state), {
      refuse: 'refuse',
      clarify: 'clarify',
      direct_answer: 'direct_answer',
      rag_prepare: 'rag_prepare',
    })
    .addEdge('rag_prepare', 'rag_retrieve')
    .addEdge('rag_retrieve', 'rag_quality_gate')
    .addConditionalEdges('rag_quality_gate', (input: GraphUpdate) => routeAfterQualityGate(input.state), {
      generate_sql: 'generate_sql',
      generate_report: 'generate_report',
      rag_retrieve: 'rag_retrieve',
      refuse: 'refuse',
    })
    .addEdge('generate_sql', 'validate')
    .addEdge('generate_report', 'validate')
    .addConditionalEdges('validate', (input: GraphUpdate) => routeAfterValidate(input.state), {
      generate_sql: 'generate_sql',
      generate_report: 'generate_report',
      execute_report: 'execute_report',
      summarize: 'summarize',
      refuse: 'refuse',
    })
    .addConditionalEdges('execute_report', (input: GraphUpdate) => routeAfterExecute(input.state), {
      generate_report: 'generate_report',
      summarize: 'summarize',
      refuse: 'refuse',
    })
    .addConditionalEdges('summarize', (input: GraphUpdate) => routeAfterSummarize(input.state), {
      analyze_report: 'analyze_report',
      grounding_check: 'grounding_check',
    })
    .addEdge('analyze_report', 'compose_spec')
    .addEdge('compose_spec', 'render_artifact')
    .addEdge('render_artifact', 'grounding_check')
    .addConditionalEdges('grounding_check', (input: GraphUpdate) => routeAfterGrounding(input.state), {
      refuse: 'refuse',
      stream_output: 'stream_output',
    })
    .addEdge('clarify', 'stream_output')
    .addEdge('direct_answer', 'stream_output')
    .addEdge('refuse', 'stream_output')
    .addEdge('stream_output', END);

  return graph.compile({
    checkpointer: checkpointer ?? new MemorySaver(),
  });
}

export type CompiledWorkflow = ReturnType<typeof buildWorkflowGraph>;

export async function runWorkflow(
  initial: WorkflowGraphState,
  deps: WorkflowDeps,
  checkpointer?: BaseCheckpointSaver,
): Promise<WorkflowGraphState> {
  const app = buildWorkflowGraph(deps, checkpointer);
  const threadId = `${initial.sessionId}:${initial.runId}`;
  const result = await app.invoke(
    { state: initial },
    { configurable: { deps, thread_id: threadId, checkpoint_id: initial.checkpointId } },
  );
  return result.state;
}
