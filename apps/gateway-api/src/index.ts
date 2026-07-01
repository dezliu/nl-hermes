import express from 'express';
import cors from 'cors';
import { createServiceApp } from '@hermes/shared';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

const PORT = Number(process.env.PORT ?? 4000);
const app = createServiceApp('gateway-api');

const typeDefs = `#graphql
  type Query {
    health: String!
    version: String!
  }
`;

const resolvers = {
  Query: {
    health: () => 'ok',
    version: () => '0.1.0',
  },
};

async function main() {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server) as unknown as express.RequestHandler,
  );

  app.listen(PORT, () => {
    console.log(`[gateway-api] GraphQL on :${PORT}/graphql`);
  });
}

main().catch(console.error);
