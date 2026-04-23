import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

export const authRouter = createTRPCRouter({
  healthCheck: publicProcedure
    .input(z.object({}).optional())
    .mutation(async () => {
      return { success: true };
    }),
});
