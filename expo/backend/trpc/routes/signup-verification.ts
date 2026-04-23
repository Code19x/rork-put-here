import { z } from "zod";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { createTRPCRouter, publicProcedure } from "../create-context";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FROM_EMAIL = "PutHere <no-reply@puthereapp.com>";

function generateCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return digits.toString();
}

async function findUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return null;
  return data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
}

async function getSignupMeta(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;
  const meta = data.user.user_metadata;
  return {
    signupCode: meta?.signup_code as string | undefined,
    signupExpires: meta?.signup_expires as number | undefined,
    signupAttempts: (meta?.signup_attempts as number) ?? 0,
  };
}

async function setSignupMeta(
  userId: string,
  code: string,
  expiresAt: number,
  attempts: number
) {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  const existing = (data?.user?.user_metadata ?? {}) as Record<string, unknown>;
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existing,
      signup_code: code,
      signup_expires: expiresAt,
      signup_attempts: attempts,
    },
  });
}

async function clearSignupMeta(userId: string) {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  const existing = (data?.user?.user_metadata ?? {}) as Record<string, unknown>;
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existing,
      signup_code: null,
      signup_expires: null,
      signup_attempts: null,
    },
  });
}

async function sendVerificationEmail(email: string, code: string) {
  const emailResult = await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: "Your PutHere Verification Code",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #D2691E; font-size: 28px; margin: 0;">PutHere</h1>
          <p style="color: #8D6E63; font-size: 14px; margin: 4px 0 0;">Personal Stuff Tracker</p>
        </div>
        <div style="background: #FFF8E1; border-radius: 12px; padding: 24px; border-left: 4px solid #D2691E;">
          <h2 style="color: #5D4037; margin: 0 0 12px;">Verify Your Email</h2>
          <p style="color: #6D4C41; line-height: 1.6; margin: 0 0 20px;">
            Welcome to PutHere! Use the code below to verify your email and complete your sign up:
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <div style="display: inline-block; padding: 16px 32px; background: #FFFFFF; border: 2px solid #D2691E; border-radius: 12px;">
              <span style="font-size: 32px; font-weight: 700; color: #5D4037; letter-spacing: 8px;">${code}</span>
            </div>
          </div>
          <p style="color: #8D6E63; font-size: 13px; text-align: center; margin: 0;">
            This code expires in 10 minutes.
          </p>
        </div>
        <p style="color: #A1887F; font-size: 12px; text-align: center; margin-top: 24px;">
          If you didn't create a PutHere account, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  return emailResult;
}

export const signupVerificationRouter = createTRPCRouter({
  initiateSignup: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      console.log("signupVerification.initiateSignup: email =", email);

      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        if (existingUser.email_confirmed_at) {
          console.log("signupVerification.initiateSignup: email already registered and confirmed:", email);
          return { success: false, error: "An account with this email already exists." };
        }

        console.log("signupVerification.initiateSignup: unconfirmed user exists, updating and resending code");
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password: input.password,
          user_metadata: {
            display_name: input.name,
            auth_method: "email",
            two_factor_enabled: false,
          },
        });

        const code = generateCode();
        const expiresAt = Date.now() + 10 * 60 * 1000;
        await setSignupMeta(existingUser.id, code, expiresAt, 0);

        try {
          const emailResult = await sendVerificationEmail(email, code);
          if (emailResult.error) {
            console.error("signupVerification.initiateSignup: Resend error:", emailResult.error);
            return { success: false, error: "Failed to send verification email. Please try again." };
          }
          console.log("signupVerification.initiateSignup: code resent to existing unconfirmed user:", email);
        } catch (emailErr) {
          console.error("signupVerification.initiateSignup: email exception:", emailErr);
          return { success: false, error: "Failed to send verification email. Please try again." };
        }

        return { success: true, needsVerification: true };
      }

      console.log("signupVerification.initiateSignup: creating new user via admin API");
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: false,
        user_metadata: {
          display_name: input.name,
          auth_method: "email",
          two_factor_enabled: false,
        },
      });

      if (createErr) {
        console.error("signupVerification.initiateSignup: create user error:", createErr.message);
        if (createErr.message?.toLowerCase().includes("already been registered") || createErr.message?.toLowerCase().includes("already exists")) {
          return { success: false, error: "An account with this email already exists." };
        }
        return { success: false, error: createErr.message };
      }

      if (!newUser?.user) {
        return { success: false, error: "Failed to create account. Please try again." };
      }

      const code = generateCode();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      await setSignupMeta(newUser.user.id, code, expiresAt, 0);

      try {
        const emailResult = await sendVerificationEmail(email, code);
        if (emailResult.error) {
          console.error("signupVerification.initiateSignup: Resend error:", emailResult.error);
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          return { success: false, error: "Failed to send verification email. Please try again." };
        }
        console.log("signupVerification.initiateSignup: verification code sent to:", email);
      } catch (emailErr) {
        console.error("signupVerification.initiateSignup: email exception:", emailErr);
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        return { success: false, error: "Failed to send verification email. Please try again." };
      }

      return { success: true, needsVerification: true };
    }),

  verifyCode: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        code: z.string().min(6).max(6),
      })
    )
    .mutation(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      const code = input.code.trim();
      console.log("signupVerification.verifyCode: email =", email);

      const user = await findUserByEmail(email);
      if (!user) {
        return { success: false, error: "No pending verification found. Please sign up again." };
      }

      const meta = await getSignupMeta(user.id);
      if (!meta?.signupCode || !meta.signupExpires) {
        return { success: false, error: "No verification code found. Please request a new one." };
      }

      if (meta.signupExpires < Date.now()) {
        await clearSignupMeta(user.id);
        return { success: false, error: "Code has expired. Please request a new one." };
      }

      if (meta.signupAttempts >= 5) {
        await clearSignupMeta(user.id);
        return { success: false, error: "Too many attempts. Please request a new code." };
      }

      await setSignupMeta(user.id, meta.signupCode, meta.signupExpires, meta.signupAttempts + 1);

      if (meta.signupCode !== code) {
        console.log("signupVerification.verifyCode: incorrect code for", email);
        return { success: false, error: "Incorrect code. Please try again." };
      }

      console.log("signupVerification.verifyCode: code correct, confirming email for", email);
      const { error: confirmErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });

      if (confirmErr) {
        console.error("signupVerification.verifyCode: confirm email error:", confirmErr.message);
        return { success: false, error: "Failed to verify email. Please try again." };
      }

      await clearSignupMeta(user.id);
      console.log("signupVerification.verifyCode: email confirmed for", email);
      return { success: true };
    }),

  resendCode: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      console.log("signupVerification.resendCode: email =", email);

      const user = await findUserByEmail(email);
      if (!user) {
        return { success: false, error: "No pending verification found." };
      }

      const existingMeta = await getSignupMeta(user.id);
      if (existingMeta?.signupExpires && existingMeta.signupExpires > Date.now()) {
        const codeAge = Date.now() - (existingMeta.signupExpires - 10 * 60 * 1000);
        if (codeAge < 30 * 1000) {
          console.log("signupVerification.resendCode: rate limited for", email);
          return { success: true };
        }
      }

      const code = generateCode();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      await setSignupMeta(user.id, code, expiresAt, 0);

      try {
        const emailResult = await sendVerificationEmail(email, code);
        if (emailResult.error) {
          console.error("signupVerification.resendCode: Resend error:", emailResult.error);
          return { success: false, error: "Failed to resend code. Please try again." };
        }
        console.log("signupVerification.resendCode: code resent to", email);
        return { success: true };
      } catch (emailErr) {
        console.error("signupVerification.resendCode: email exception:", emailErr);
        return { success: false, error: "Failed to resend code. Please try again." };
      }
    }),
});
