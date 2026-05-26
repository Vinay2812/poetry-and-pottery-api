import bodyParser from "body-parser";
import compression from "compression";
import cors from "cors";
import express from "express";
import { GraphQLScalarType } from "graphql";
import { DateTimeResolver } from "graphql-scalars";
import { GraphQLUpload, graphqlUploadExpress } from "graphql-upload-minimal";
import helmet from "helmet";
import http from "http";
import "reflect-metadata";
import { buildSchema } from "type-graphql";

import {
  CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY,
  ENV,
  ORIGINS,
  PORT,
} from "@/consts/env";
import { prisma } from "@/lib/prisma";
import * as Resolvers from "@/resolvers";
import { seedSiteContentDefaults } from "@/resolvers/admin/settings/seed";
import { Context } from "@/types/context";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { clerkMiddleware } from "@clerk/express";
import { authMiddleWare } from "@middlewares/auth.middleware";
import { errorMiddleware } from "@middlewares/error.middleware";
import { logMiddleware } from "@middlewares/log.middleware";

import packageJson from "../package.json";

class App {
  private app = express();
  private httpServer = http.createServer(this.app);

  private async startApolloServer() {
    // Extract all resolver classes from the imported resolvers
    // This ensures we use the same resolvers as defined in src/resolvers/index.ts
    const resolverClasses = Object.values(Resolvers).filter(
      (resolver) => typeof resolver === "function" && resolver.prototype,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as (new () => any)[];

    const schema = await buildSchema({
      emitSchemaFile: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolvers: resolverClasses as [new () => any, ...(new () => any)[]],
      scalarsMap: [
        { type: GraphQLScalarType, scalar: DateTimeResolver },
        {
          type: GraphQLScalarType,
          scalar: GraphQLUpload,
        },
      ],
      validate: { forbidUnknownValues: false },
    });

    const server = new ApolloServer<Context>({
      schema,
      introspection: true,
    });

    await server.start();

    return server;
  }

  private async configureMiddleware() {
    this.app.use(
      cors({
        origin: ORIGINS.length > 0 ? ORIGINS : true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
      }),
    );
    this.app.use(
      bodyParser.json({
        limit: "20mb",
      }),
    );
    this.app.use(
      bodyParser.urlencoded({
        limit: "256mb",
        extended: true,
        parameterLimit: 200000,
      }),
    );
    this.app.use(
      clerkMiddleware({
        secretKey: CLERK_SECRET_KEY,
        publishableKey: CLERK_PUBLISHABLE_KEY,
      }),
    );
    this.app.use(compression());
    this.app.use(helmet());
    this.app.use(logMiddleware);
    this.app.use(graphqlUploadExpress());
  }

  private async configureRoutes(apolloServer: ApolloServer<Context>) {
    this.app.get("/health", (req, res) => {
      res.status(200).json({
        status: "ok",
        version: packageJson.version,
        timestamp: new Date().toISOString(),
      });
    });

    this.app.use(
      "/graphql",
      expressMiddleware(apolloServer, {
        context: (ctx) => authMiddleWare(ctx.req, ctx.res),
      }),
    );

    this.app.use(errorMiddleware);
  }

  public async start() {
    const apolloServer = await this.startApolloServer();
    await this.configureMiddleware();
    await this.configureRoutes(apolloServer);
    try {
      await seedSiteContentDefaults(prisma);
    } catch (err) {
      console.error("[seed] seedSiteContentDefaults failed:", err);
    }
    this.httpServer.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(
        `🌍 Environment: ${ENV.toUpperCase()}. Version: ${packageJson.version}`,
      );
      console.log(`===============================================`);
      console.log(
        `🔗 GraphQL API is ready at http://localhost:${PORT}/graphql`,
      );
      console.log(`🚀 Server is running on port ${PORT} `);
      console.log(`===============================================`);
    });
  }
}

export default App;
