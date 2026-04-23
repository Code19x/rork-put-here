import { z } from "zod";
import { Resend } from "resend";
import { createTRPCRouter, publicProcedure } from "../create-context";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "PutHere <no-reply@puthereapp.com>";

export const inviteRouter = createTRPCRouter({
  sendInvitation: publicProcedure
    .input(
      z.object({
        inviterName: z.string().min(1),
        inviterEmail: z.string().email(),
        inviteeEmail: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const { inviterName, inviterEmail, inviteeEmail } = input;

      console.log("Sending invitation email from", inviterEmail, "to", inviteeEmail);

      const signUpDeepLink = `exp+rork-app://auth/sign-up?invite_email=${encodeURIComponent(inviteeEmail)}&inviter=${encodeURIComponent(inviterName)}`;

      try {
        const { data, error } = await resend.emails.send({
          from: FROM_EMAIL,
          to: [inviteeEmail],
          subject: `${inviterName} invited you to share their PutHere account`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #D2691E; font-size: 28px; margin: 0;">PutHere</h1>
                <p style="color: #8D6E63; font-size: 14px; margin: 4px 0 0;">Personal Stuff Tracker</p>
              </div>
              <div style="background: #FFF8E1; border-radius: 12px; padding: 24px; border-left: 4px solid #D2691E;">
                <h2 style="color: #5D4037; margin: 0 0 12px;">You've been invited!</h2>
                <p style="color: #6D4C41; line-height: 1.6; margin: 0;">
                  <strong>${inviterName}</strong> (${inviterEmail}) has invited you to share access to their PutHere account.
                </p>
              </div>
              <div style="margin-top: 24px;">
                <p style="color: #6D4C41; line-height: 1.6; text-align: center;">
                  To accept the invitation, open <strong>PutHere</strong> in the Expo Go app and create an account using this email address:
                </p>
                <div style="text-align: center; margin: 16px 0;">
                  <div style="display: inline-block; padding: 12px 24px; background: #FFF3E0; border: 2px solid #D2691E; border-radius: 10px;">
                    <span style="font-size: 16px; font-weight: 700; color: #5D4037;">${inviteeEmail}</span>
                  </div>
                </div>
                <div style="text-align: center; margin-top: 24px;">
                  <p style="color: #5D4037; font-weight: 600; font-size: 15px; margin-bottom: 16px;">How to get started:</p>
                  <div style="text-align: left; max-width: 420px; margin: 0 auto;">
                    <p style="color: #6D4C41; font-size: 14px; line-height: 1.8; margin: 0;">
                      <strong>Step 1:</strong> Install <strong>Expo Go</strong> on your phone<br/>
                      &nbsp;&nbsp;&bull; <a href="https://apps.apple.com/app/expo-go/id982107779" style="color: #D2691E;">Download for iPhone</a><br/>
                      &nbsp;&nbsp;&bull; <a href="https://play.google.com/store/apps/details?id=host.exp.exponent" style="color: #D2691E;">Download for Android</a>
                    </p>
                    <p style="color: #6D4C41; font-size: 14px; line-height: 1.8; margin: 12px 0 0;">
                      <strong>Step 2:</strong> Open Expo Go and enter this project URL:<br/>
                      <code style="display: inline-block; margin-top: 6px; padding: 8px 12px; background: #FFF3E0; border: 1px solid #FFCC80; border-radius: 6px; font-size: 13px; color: #5D4037; word-break: break-all;">exp+rork-app://</code>
                    </p>
                    <p style="color: #6D4C41; font-size: 14px; line-height: 1.8; margin: 12px 0 0;">
                      <strong>Step 3:</strong> Tap <strong>Sign Up</strong> and create your account using the email address above (<strong>${inviteeEmail}</strong>). Choose a password and you're in!
                    </p>
                  </div>
                </div>
                <div style="text-align: center; margin-top: 20px; padding: 14px; background: #E8F5E9; border-radius: 10px;">
                  <p style="color: #2E7D32; font-size: 13px; margin: 0; font-weight: 500;">
                    Once you sign up with <strong>${inviteeEmail}</strong>, you'll automatically have access to <strong>${inviterName}'s</strong> shared items.
                  </p>
                </div>
              </div>
              <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #EFEBE9;">
                <p style="color: #A1887F; font-size: 12px; text-align: center; margin: 0;">
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
            </div>
          `,
        });

        if (error) {
          console.error("Resend invitation email error:", error);
          throw new Error("Failed to send invitation email.");
        }

        console.log("Invitation email sent successfully, id:", data?.id);
        return { success: true };
      } catch (err) {
        console.error("Send invitation exception:", err);
        throw new Error("Failed to send invitation email.");
      }
    }),
});
