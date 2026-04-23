import { z } from "zod";
import { Resend } from "resend";
import { createTRPCRouter, publicProcedure } from "../create-context";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "PutHere <no-reply@puthereapp.com>";

export const trialRouter = createTRPCRouter({
  sendReminder: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
        daysLeft: z.number().min(0).max(7),
        autoCharge: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      const greetingName = input.name?.split(" ")[0] ?? "there";
      console.log("trial.sendReminder: sending to", email, "daysLeft=", input.daysLeft);

      const subject = input.autoCharge
        ? `Your PutHere trial ends in ${input.daysLeft} days — auto-renewal is on`
        : `Your PutHere trial ends in ${input.daysLeft} days — subscribe to keep your stash`;

      const ctaText = input.autoCharge
        ? "You chose automatic billing when your trial ends, so you don't need to do anything. If you'd like to cancel, open the app and manage your subscription."
        : "To keep access to your stash after the trial ends, subscribe now in the app. Otherwise, your account will be locked until a subscription is purchased.";

      try {
        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to: [email],
          subject,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #D2691E; font-size: 28px; margin: 0;">PutHere</h1>
                <p style="color: #8D6E63; font-size: 14px; margin: 4px 0 0;">Personal Stuff Tracker</p>
              </div>
              <div style="background: #FFF8E1; border-radius: 12px; padding: 24px; border-left: 4px solid #D2691E;">
                <h2 style="color: #5D4037; margin: 0 0 12px;">Hi ${greetingName},</h2>
                <p style="color: #6D4C41; line-height: 1.6; margin: 0 0 16px;">
                  Your 7-day free trial ends in <strong>${input.daysLeft} day${input.daysLeft === 1 ? "" : "s"}</strong>.
                </p>
                <p style="color: #6D4C41; line-height: 1.6; margin: 0 0 16px;">${ctaText}</p>
                <div style="background: #FFFFFF; border: 1px solid #FFCC80; border-radius: 10px; padding: 16px; margin-top: 16px;">
                  <p style="color: #5D4037; margin: 0 0 8px; font-weight: 600;">Plans</p>
                  <p style="color: #6D4C41; margin: 0; font-size: 14px;">Monthly — $1.99 / month</p>
                  <p style="color: #6D4C41; margin: 4px 0 0; font-size: 14px;">Yearly — $19.99 / year (save 17%)</p>
                </div>
              </div>
              <p style="color: #A1887F; font-size: 12px; text-align: center; margin-top: 24px;">
                Thanks for trying PutHere. Manage your subscription anytime in the app.
              </p>
            </div>
          `,
        });

        if (result.error) {
          console.error("trial.sendReminder: Resend error:", result.error);
          return { success: false, error: "Failed to send reminder email." };
        }

        return { success: true };
      } catch (err) {
        console.error("trial.sendReminder: exception:", err);
        return { success: false, error: "Failed to send reminder email." };
      }
    }),
});
