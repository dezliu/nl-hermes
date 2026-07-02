import { describe, it, expect } from 'vitest';

const PHASE6_TYPE_DEFS = `#graphql
  enum FeedbackRating { up down }

  type TemplateRecommendation {
    id: ID!
    name: String!
    scenarioDescription: String!
    score: Float!
    type: GenerationMode!
  }

  type ConversationSummary {
    id: ID!
    title: String!
    mode: GenerationMode!
    lastActiveAt: String!
  }

  type Query {
    matchTemplates(userId: ID!, query: String!, mode: GenerationMode!): [TemplateRecommendation!]!
    conversations(userId: ID!): [ConversationSummary!]!
    conversationMessages(userId: ID!, conversationId: ID!): [ChatMessageRecord!]!
    templateDetail(id: ID!, type: GenerationMode!): TemplateDetail
  }

  type Mutation {
    submitMessageFeedback(input: SubmitFeedbackInput!): Boolean!
    renameConversation(input: RenameConversationInput!): ConversationSummary!
    deleteConversation(input: DeleteConversationInput!): Boolean!
  }
`;

describe('gateway-api Phase 6 schema', () => {
  it('defines template recommendation and conversation queries', () => {
    expect(PHASE6_TYPE_DEFS).toContain('matchTemplates');
    expect(PHASE6_TYPE_DEFS).toContain('conversations');
    expect(PHASE6_TYPE_DEFS).toContain('conversationMessages');
    expect(PHASE6_TYPE_DEFS).toContain('templateDetail');
  });

  it('defines feedback and conversation mutations', () => {
    expect(PHASE6_TYPE_DEFS).toContain('submitMessageFeedback');
    expect(PHASE6_TYPE_DEFS).toContain('renameConversation');
    expect(PHASE6_TYPE_DEFS).toContain('deleteConversation');
  });
});

describe('gateway-api schema', () => {
  it('defines chat mutations', () => {
    const typeDefs = `
      mutation Start($input: StartChatInput!) {
        startChat(input: $input) { runId conversationId checkpointId }
      }
    `;
    expect(typeDefs).toContain('startChat');
    expect(typeDefs).toContain('checkpointId');
  });
});
