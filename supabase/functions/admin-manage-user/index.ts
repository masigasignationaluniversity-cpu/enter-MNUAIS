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

    const body = await req.json();
    const { action, caller_local_id } = body;

    // Verify the caller is an admin
    if (caller_local_id) {
      const { data: callerProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('local_id', caller_local_id)
        .eq('role', 'admin')
        .single();

      if (!callerProfile) {
        return new Response(JSON.stringify({ error: 'Forbidden - admin only' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // CREATE new user — stores password_hash in profiles (no Supabase Auth needed)
    if (action === 'create') {
      const { username, password, role, name, local_id, email, department, program, year_level, student_number, employee_id } = body;

      // Hash the password using pgcrypto via SQL
      const { data: hashData, error: hashErr } = await supabaseAdmin.rpc('hash_password', { p_password: password });
      if (hashErr) throw hashErr;

      const { error } = await supabaseAdmin.from('profiles').insert({
        id: crypto.randomUUID(),
        local_id,
        username,
        role,
        name,
        email: email || (username + '@ais.local'),
        contact_email: email || null,
        department: department || null,
        program: program || null,
        year_level: year_level || null,
        student_number: student_number || null,
        employee_id: employee_id || null,
        status: 'active',
        password_hash: hashData,
      });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, localId: local_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // UPDATE CREDENTIALS — update username and/or password_hash
    if (action === 'update_credentials') {
      const { local_id, new_username, new_password } = body;

      const dbUpdates: Record<string, string> = {};
      if (new_username) dbUpdates.username = new_username;

      if (new_password) {
        const { data: hashData, error: hashErr } = await supabaseAdmin.rpc('hash_password', { p_password: new_password });
        if (hashErr) throw hashErr;
        dbUpdates.password_hash = hashData;
      }

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabaseAdmin.from('profiles').update(dbUpdates).eq('local_id', local_id);
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DEACTIVATE user
    if (action === 'deactivate') {
      const { local_id } = body;
      await supabaseAdmin.from('profiles').update({ status: 'inactive' }).eq('local_id', local_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('admin-manage-user error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
