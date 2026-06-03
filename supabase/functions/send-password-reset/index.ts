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
  // Ensure at least one of each type
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  // Shuffle
  return password.split("").sort(() => Math.random() - 0.5).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { username } = await req.json();
    if (!username) return new Response(JSON.stringify({ error: "Username is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

    if (lookupErr || !profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ error: "Username not found. Please check and try again." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const profile = profiles[0];
    if (!profile.email) {
      return new Response(JSON.stringify({ error: "No email address is registered for this account. Contact your administrator." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Generate new password
    const newPassword = generatePassword(10);

    // 3. Update password in DB
    const { error: pwErr } = await supabase.rpc("update_user_password", {
      p_username: username.trim(),
      p_password: newPassword,
    });
    if (pwErr) throw new Error(pwErr.message);

    // 4. Create ticket (auto-resolved)
    await supabase.from("password_reset_tickets").insert({
      username: username.trim(),
      name: profile.name,
      status: "resolved",
      new_password: newPassword,
      resolved_at: new Date().toISOString(),
    });

    // 5. Send email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

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
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
            <h2 style="color: #1a1a2e; margin-bottom: 8px;">Password Reset</h2>
            <p style="color: #555; margin-bottom: 24px;">Hi <strong>${profile.name}</strong>,</p>
            <p style="color: #555;">Your password has been reset by the system. Use the temporary password below to sign in:</p>
            <div style="background: #1a1a2e; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
              <span style="font-family: monospace; font-size: 22px; font-weight: bold; color: #ffffff; letter-spacing: 4px;">${newPassword}</span>
            </div>
            <p style="color: #777; font-size: 13px;">For security, please change your password after signing in.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #aaa; font-size: 12px;">If you did not request this reset, please contact your administrator immediately.</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.json().catch(() => ({}));
      console.error("Resend error:", errBody);
      throw new Error(`Failed to send email: ${errBody?.message || emailRes.statusText}`);
    }

    return new Response(JSON.stringify({ success: true, message: `Password reset email sent to ${profile.email}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
