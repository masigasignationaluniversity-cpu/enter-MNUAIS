import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const ADMIN_EMAIL = 'admin@ais.local';
  const ADMIN_PASSWORD = 'Admin@2025';

  try {
    // Step 1: Try to find existing admin user by email using service role
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(
      'ae76b0a7-a379-4c20-8ddd-b44d7bf11fd2'
    );

    console.log('Existing user check:', existingUser?.user?.email, getUserError?.message);

    if (existingUser?.user) {
      // Step 2a: Update existing user's password
      const { data: updated, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.user.id,
        {
          password: ADMIN_PASSWORD,
          email: ADMIN_EMAIL,
          email_confirm: true,
        }
      );
      if (updateErr) throw new Error('Update failed: ' + updateErr.message);
      console.log('Password updated for:', updated.user?.email);
      return new Response(JSON.stringify({ action: 'updated', userId: updated.user?.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      // Step 2b: Create fresh admin user
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });
      if (createErr) throw new Error('Create failed: ' + createErr.message);
      const newId = newUser.user!.id;
      console.log('Created new admin user:', newId);

      // Update profiles table to use new UUID
      await supabaseAdmin.from('profiles').update({ id: newId }).eq('local_id', 'u-admin1');

      return new Response(JSON.stringify({ action: 'created', userId: newId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    console.error('setup-admin error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
