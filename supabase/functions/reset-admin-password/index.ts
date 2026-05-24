import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Use known admin UUID directly (faster, no listUsers needed)
    const ADMIN_UUID = 'ae76b0a7-a379-4c20-8ddd-b44d7bf11fd2';

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      ADMIN_UUID,
      { password: 'Admin@2025' }
    );

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, message: 'Admin password reset to Admin@2025' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('reset-admin-password error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
