import { createTRPCRouter } from "./create-context";
import { authRouter } from "./routes/auth";
import { contactRouter } from "./routes/contact";
import { inviteRouter } from "./routes/invite";
import { passwordResetRouter } from "./routes/password-reset";
import { signupVerificationRouter } from "./routes/signup-verification";
import { trialRouter } from "./routes/trial";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  contact: contactRouter,
  invite: inviteRouter,
  passwordReset: passwordResetRouter,
  signupVerification: signupVerificationRouter,
  trial: trialRouter,
});

export type AppRouter = typeof appRouter;
