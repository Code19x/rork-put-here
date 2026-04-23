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

async function getResetMeta(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;
  const meta = data.user.user_metadata;
  return {
    resetCode: meta?.reset_code as string | undefined,
    resetExpires: meta?.reset_expires as number | undefined,
    resetAttempts: (meta?.reset_attempts as number) ?? 0,
    resetVerified: (meta?.reset_verified as boolean) ?? false,
  };
}

async function setResetMeta(
  userId: string,
  code: string,
  expiresAt: number,
  attempts: number,
  verified: boolean
) {
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      reset_code: code,
      reset_expires: expiresAt,
      reset_attempts: attempts,
      reset_verified: verified,
    },
  });
}

async function clearResetMeta(userId: string) {
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      reset_code: null,
      reset_expires: null,
      reset_attempts: null,
      reset_verified: null,
    },
  });
}

export const passwordResetRouter = createTRPCRouter({
  requestCode: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      console.log("passwordReset.requestCode: email =", email);

      const user = await findUserByEmail(email);

      if (!user) {
        console.log("passwordReset.requestCode: no user found for", email);
        return { success: true };
      }

      const existingMeta = await getResetMeta(user.id);
      if (existingMeta?.resetExpires && existingMeta.resetExpires > Date.now()) {
        const codeAge = Date.now() - (existingMeta.resetExpires - 10 * 60 * 1000);
        if (codeAge < 30 * 1000) {
          console.log("passwordReset.requestCode: rate limited for", email);
          return { success: true };
        }
      }

      const code = generateCode();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      await setResetMeta(user.id, code, expiresAt, 0, false);

      console.log("passwordReset.requestCode: generated code for", email);

      try {
        const emailResult = await resend.emails.send({
          from: FROM_EMAIL,
          to: [email],
          subject: "Your PutHere Password Reset Code",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #D2691E; font-size: 28px; margin: 0;">PutHere</h1>
                <p style="color: #8D6E63; font-size: 14px; margin: 4px 0 0;">Personal Stuff Tracker</p>
              </div>
              <div style="background: #FFF8E1; border-radius: 12px; padding: 24px; border-left: 4px solid #D2691E;">
                <h2 style="color: #5D4037; margin: 0 0 12px;">Password Reset Code</h2>
                <p style="color: #6D4C41; line-height: 1.6; margin: 0 0 20px;">
                  You requested to reset your password. Use the code below to continue:
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
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          `,
        });
        console.log("passwordReset.requestCode: email send result:", JSON.stringify(emailResult));

        if (emailResult.error) {
          console.error("passwordReset.requestCode: Resend API error:", emailResult.error);
          await clearResetMeta(user.id);
          return { success: false, error: "Failed to send reset code. Please check your email address and try again." };
        }

        console.log("passwordReset.requestCode: email sent to", email);
      } catch (emailErr) {
        console.error("passwordReset.requestCode: email send error:", emailErr);
        await clearResetMeta(user.id);
        return { success: false, error: "Failed to send reset code email. Please try again later." };
      }

      return { success: true };
    }),

  verifyCode: publicProcedure
    .input(z.object({ email: z.string().email(), code: z.string().min(6).max(6) }))
    .mutation(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      const code = input.code.trim();
      console.log("passwordReset.verifyCode: email =", email);

      const user = await findUserByEmail(email);
      if (!user) {
        console.log("passwordReset.verifyCode: no user for", email);
        return { success: false, error: "Code expired or not found. Please request a new code." };
      }

      const meta = await getResetMeta(user.id);
      if (!meta?.resetCode || !meta.resetExpires) {
        console.log("passwordReset.verifyCode: no reset data for", email);
        return { success: false, error: "Code expired or not found. Please request a new code." };
      }

      if (meta.resetExpires < Date.now()) {
        await clearResetMeta(user.id);
        return { success: false, error: "Code has expired. Please request a new code." };
      }

      if (meta.resetAttempts >= 5) {
        await clearResetMeta(user.id);
        return { success: false, error: "Too many attempts. Please request a new code." };
      }

      await setResetMeta(user.id, meta.resetCode, meta.resetExpires, meta.resetAttempts + 1, false);

      if (meta.resetCode !== code) {
        console.log("passwordReset.verifyCode: incorrect code for", email);
        return { success: false, error: "Incorrect code. Please try again." };
      }

      await setResetMeta(user.id, meta.resetCode, meta.resetExpires, meta.resetAttempts + 1, true);
      console.log("passwordReset.verifyCode: code verified for", email);
      return { success: true };
    }),

  completeReset: publicProcedure
    .input(z.object({ email: z.string().email(), code: z.string().min(6).max(6), newPassword: z.string().min(8) }))
    .mutation(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      const code = input.code.trim();
      console.log("passwordReset.completeReset: email =", email);

      const user = await findUserByEmail(email);
      if (!user) {
        console.log("passwordReset.completeReset: no user for", email);
        return { success: false, error: "Invalid or expired reset session. Please start over." };
      }

      const meta = await getResetMeta(user.id);
      if (!meta?.resetCode || !meta.resetVerified || meta.resetCode !== code) {
        console.log("passwordReset.completeReset: invalid or unverified for", email);
        return { success: false, error: "Invalid or expired reset session. Please start over." };
      }

      if (!meta.resetExpires || meta.resetExpires < Date.now()) {
        await clearResetMeta(user.id);
        return { success: false, error: "Reset session has expired. Please start over." };
      }

      try {
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { password: input.newPassword }
        );

        if (updateErr) {
          console.error("passwordReset.completeReset: update error:", updateErr);
          return { success: false, error: "Failed to update password. Please try again." };
        }

        await clearResetMeta(user.id);
        console.log("passwordReset.completeReset: password updated for", email);
        return { success: true };
      } catch (err) {
        console.error("passwordReset.completeReset: exception:", err);
        return { success: false, error: "Failed to update password. Please try again." };
      }
    }),

  resendCode: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      console.log("passwordReset.resendCode: email =", email);

      const user = await findUserByEmail(email);
      if (!user) {
        return { success: false, error: "No pending reset. Please start over." };
      }

      const meta = await getResetMeta(user.id);
      if (!meta?.resetCode) {
        return { success: false, error: "No pending reset. Please start over." };
      }

      const code = generateCode();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      await setResetMeta(user.id, code, expiresAt, 0, false);

      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: [email],
          subject: "Your PutHere Password Reset Code",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #D2691E; font-size: 28px; margin: 0;">PutHere</h1>
                <p style="color: #8D6E63; font-size: 14px; margin: 4px 0 0;">Personal Stuff Tracker</p>
              </div>
              <div style="background: #FFF8E1; border-radius: 12px; padding: 24px; border-left: 4px solid #D2691E;">
                <h2 style="color: #5D4037; margin: 0 0 12px;">Password Reset Code</h2>
                <p style="color: #6D4C41; line-height: 1.6; margin: 0 0 20px;">
                  Here is your new password reset code:
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
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          `,
        });
        console.log("passwordReset.resendCode: email sent to", email);
        return { success: true };
      } catch (emailErr) {
        console.error("passwordReset.resendCode: email send error:", emailErr);
        return { success: false, error: "Failed to resend code. Please try again." };
      }
    }),
});
