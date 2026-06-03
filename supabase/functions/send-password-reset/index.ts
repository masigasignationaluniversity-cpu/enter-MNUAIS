import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generatePassword(length = 10): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "@#!";
  const all = upper + lower + digits + special;
  let password = "";
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  return password.split("").sort(() => Math.random() - 0.5).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { username } = await req.json();
    if (!username?.trim()) return respond({ error: "Username is required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Look up profile
    const { data: profiles, error: lookupErr } = await supabase
      .from("profiles")
      .select("name, email, username")
      .eq("username", username.trim())
      .neq("status", "inactive")
      .limit(1);

    if (lookupErr) {
      console.error("Profile lookup error:", lookupErr.message);
      return respond({ error: "Database error. Please try again." }, 500);
    }
    if (!profiles || profiles.length === 0) {
      return respond({ error: "Username not found. Please check and try again." }, 404);
    }

    const profile = profiles[0];
    if (!profile.email) {
      return respond({ error: "No email address registered for this account. Contact your administrator." }, 400);
    }

    // 2. Generate new password
    const newPassword = generatePassword(10);

    // 3. Update password in DB
    const { error: pwErr } = await supabase.rpc("update_user_password", {
      p_username: username.trim(),
      p_password: newPassword,
    });
    if (pwErr) {
      console.error("Password update error:", pwErr.message);
      return respond({ error: "Failed to update password. Please try again." }, 500);
    }

    // 4. Log the ticket as auto-resolved
    await supabase.from("password_reset_tickets").insert({
      username: username.trim(),
      name: profile.name,
      status: "resolved",
      new_password: newPassword,
      resolved_at: new Date().toISOString(),
    });

    // 5. Send email via Resend with 15s timeout
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    let emailOk = false;
    let emailError = "";
    try {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [profile.email],
          subject: "Your Password Has Been Reset",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
              <h2 style="color:#1a1a2e;margin-bottom:8px;">Password Reset</h2>
              <p style="color:#555;">Hi <strong>${profile.name}</strong>,</p>
              <p style="color:#555;">Your password has been reset. Use the temporary password below to sign in:</p>
              <div style="background:#1a1a2e;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
                <span style="font-family:monospace;font-size:24px;font-weight:bold;color:#ffffff;letter-spacing:4px;">${newPassword}</span>
              </div>
              <p style="color:#777;font-size:13px;">For security, please change your password after signing in.</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
              <p style="color:#aaa;font-size:12px;">If you did not request this, contact your administrator immediately.</p>
            </div>
          `,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (emailRes.ok) {
        emailOk = true;
      } else {
        const body = await emailRes.json().catch(() => ({}));
        emailError = body?.message || `HTTP ${emailRes.status}`;
        console.error("Resend error:", emailError);
      }
    } catch (fetchErr) {
      clearTimeout(timer);
      emailError = fetchErr instanceof Error ? fetchErr.message : "Email timeout";
      console.error("Resend fetch error:", emailError);
    }

    if (!emailOk) {
      // Password was reset but email failed — return error so user knows
      return respond({
        error: `Password was reset but the email could not be sent (${emailError}). Contact your administrator to get your new password.`,
      }, 500);
    }

    return respond({
      success: true,
      message: `Password reset email sent to ${profile.email}`,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    console.error("Unhandled error:", msg);
    return respond({ error: msg }, 500);
  }
});
