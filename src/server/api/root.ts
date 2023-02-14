import { ingressRouter } from "./routers/ingress";
import { tokenRouter } from "./routers/token";
import { createTRPCRouter } from "./trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here
 */
export const appRouter = createTRPCRouter({
  ingress: ingressRouter,
  token: tokenRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
