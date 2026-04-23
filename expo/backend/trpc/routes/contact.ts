import { z } from "zod";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { createTRPCRouter, publicProcedure } from "../create-context";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAIL = "support@puthereapp.com";
const FROM_EMAIL = "PutHere <no-reply@puthereapp.com>";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const contactRouter = createTRPCRouter({
  sendMessage: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        subject: z.string().min(1),
        message: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const { name, email, subject, message } = input;

      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safeSubject = escapeHtml(subject);
      const safeMessage = escapeHtml(message);

      let savedToDatabase = false;
      try {
        const { error: dbError } = await supabase
          .from("contact_messages")
          .insert({ name, email, subject, message });

        if (dbError) {
          console.error("Contact DB insert error:", dbError);
        } else {
          savedToDatabase = true;
        }
      } catch (dbErr) {
        console.error("Contact DB insert exception:", dbErr);
      }

      let adminEmailSent = false;
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: [ADMIN_EMAIL],
          subject: `New Contact Message: ${subject}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #5D4037; margin-bottom: 20px;">New Contact Message</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #8D6E63; font-weight: 600; width: 100px;">Name:</td>
                  <td style="padding: 10px 0; color: #3E2723;">${safeName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #8D6E63; font-weight: 600;">Email:</td>
                  <td style="padding: 10px 0; color: #3E2723;"><a href="mailto:${safeEmail}" style="color: #D2691E;">${safeEmail}</a></td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #8D6E63; font-weight: 600;">Subject:</td>
                  <td style="padding: 10px 0; color: #3E2723;">${safeSubject}</td>
                </tr>
              </table>
              <div style="margin-top: 20px; padding: 16px; background: #FFF8E1; border-radius: 8px; border-left: 4px solid #D2691E;">
                <p style="color: #5D4037; margin: 0; white-space: pre-wrap;">${safeMessage}</p>
              </div>
              <p style="margin-top: 24px; font-size: 12px; color: #A1887F;">This message was sent from the PutHere app contact form.</p>
            </div>
          `,
        });
        adminEmailSent = true;
      } catch (adminEmailErr) {
        console.error("Failed to send admin notification email:", adminEmailErr);
      }

      let confirmationEmailSent = false;
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: [email],
          subject: "We received your message — PutHere",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #5D4037; margin-bottom: 8px;">Thanks for reaching out, ${safeName}!</h2>
              <p style="color: #6D4C41; line-height: 1.6;">
                We've received your message and our team will get back to you as soon as possible.
              </p>
              <div style="margin: 24px 0; padding: 16px; background: #FFF8E1; border-radius: 8px; border-left: 4px solid #D2691E;">
                <p style="color: #8D6E63; font-weight: 600; margin: 0 0 8px 0;">Your message:</p>
                <p style="color: #5D4037; margin: 0 0 4px 0;"><strong>Subject:</strong> ${safeSubject}</p>
                <p style="color: #5D4037; margin: 0; white-space: pre-wrap;">${safeMessage}</p>
              </div>
              <p style="color: #6D4C41; line-height: 1.6;">
                If you need immediate assistance, you can reply directly to this email.
              </p>
              <p style="color: #8D6E63; margin-top: 32px; font-size: 13px;">
                — The PutHere Team
              </p>
            </div>
          `,
        });
        confirmationEmailSent = true;
      } catch (userEmailErr) {
        console.error("Failed to send user confirmation email:", userEmailErr);
      }

      if (!savedToDatabase && !adminEmailSent && !confirmationEmailSent) {
        throw new Error("Failed to submit contact message.");
      }

      return { success: true };
    }),
});
