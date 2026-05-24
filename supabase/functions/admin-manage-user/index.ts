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

    // Verify caller is authenticated and admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden - admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { action } = body;

    // CREATE new user
    if (action === 'create') {
      const { email, password, username, role, name, local_id, department, program, year_level, student_number, employee_id } = body;

      const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw error;

      await supabaseAdmin.from('profiles').insert({
        id: newUser.user.id,
        local_id,
        username,
        role,
        name,
        email,
        department: department || null,
        program: program || null,
        year_level: year_level || null,
        student_number: student_number || null,
        employee_id: employee_id || null,
        status: 'active',
      });

      return new Response(JSON.stringify({ success: true, userId: newUser.user.id, localId: local_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // UPDATE CREDENTIALS (password and/or username)
    if (action === 'update_credentials') {
      const { local_id, new_username, new_password } = body;

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('local_id', local_id)
        .single();

      if (!profile) throw new Error('User not found');

      if (new_password) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, { password: new_password });
        if (error) throw error;
      }

      if (new_username) {
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ username: new_username })
          .eq('local_id', local_id);
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DEACTIVATE user
    if (action === 'deactivate') {
      const { local_id } = body;

      await supabaseAdmin
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('local_id', local_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('admin-manage-user error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
