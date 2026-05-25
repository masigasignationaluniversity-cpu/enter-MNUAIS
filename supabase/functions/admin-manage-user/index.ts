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

    console.log('admin-manage-user action:', action, 'caller:', caller_local_id);

    // Verify the caller is an admin
    if (caller_local_id) {
      const { data: callerProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('local_id', caller_local_id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!callerProfile) {
        return new Response(JSON.stringify({ error: 'Forbidden - admin only' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ── CREATE ──────────────────────────────────────────────────
    if (action === 'create') {
      const { username, password, role, name, local_id, email, department, program, year_level, student_number, employee_id } = body;

      const { data: hashData, error: hashErr } = await supabaseAdmin.rpc('hash_password', { p_password: password });
      if (hashErr) throw new Error('Password hashing failed: ' + hashErr.message);

      const { error: insertErr } = await supabaseAdmin.from('profiles').insert({
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

      if (insertErr) throw new Error(insertErr.message);

      return new Response(JSON.stringify({ success: true, localId: local_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── UPDATE CREDENTIALS (upsert + always activate) ───────────
    if (action === 'update_credentials') {
      const { local_id, new_username, new_password } = body;

      // Check if user exists in DB
      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('local_id, status')
        .eq('local_id', local_id)
        .maybeSingle();

      if (existing) {
        // UPDATE existing record
        const dbUpdates: Record<string, unknown> = { status: 'active' }; // always re-activate
        if (new_username) dbUpdates.username = new_username;
        if (new_password) {
          const { data: hashData, error: hashErr } = await supabaseAdmin.rpc('hash_password', { p_password: new_password });
          if (hashErr) throw new Error('Password hashing failed: ' + hashErr.message);
          dbUpdates.password_hash = hashData;
        }
        const { error } = await supabaseAdmin.from('profiles').update(dbUpdates).eq('local_id', local_id);
        if (error) throw new Error(error.message);
        console.log('Credentials updated for:', local_id);
      } else {
        // User not in DB — return an error so the client knows to create them first
        console.warn('update_credentials: user not found in DB:', local_id);
        return new Response(JSON.stringify({ error: 'user_not_found', localId: local_id }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── BULK SYNC — upsert all portal users into DB ─────────────
    if (action === 'bulk_sync') {
      const { users } = body as { users: Array<{
        local_id: string; username: string; password: string; role: string;
        name: string; email?: string; department?: string; program?: string;
        year_level?: number; student_number?: string; employee_id?: string; status?: string;
      }> };

      console.log('bulk_sync: syncing', users.length, 'users');
      const results: { local_id: string; status: string }[] = [];

      for (const u of users) {
        try {
          // Hash password
          const { data: hashData, error: hashErr } = await supabaseAdmin.rpc('hash_password', { p_password: u.password });
          if (hashErr) { results.push({ local_id: u.local_id, status: 'hash_error: ' + hashErr.message }); continue; }

          // Upsert into profiles
          const { error: upsertErr } = await supabaseAdmin.from('profiles').upsert({
            id: crypto.randomUUID(),
            local_id: u.local_id,
            username: u.username,
            role: u.role,
            name: u.name,
            email: u.email || (u.username + '@ais.local'),
            contact_email: u.email || null,
            department: u.department || null,
            program: u.program || null,
            year_level: u.year_level || null,
            student_number: u.student_number || null,
            employee_id: u.employee_id || null,
            status: u.status ?? 'active',
            password_hash: hashData,
          }, { onConflict: 'local_id', ignoreDuplicates: false });

          if (upsertErr) { results.push({ local_id: u.local_id, status: 'error: ' + upsertErr.message }); }
          else { results.push({ local_id: u.local_id, status: 'ok' }); }
        } catch (e) {
          results.push({ local_id: u.local_id, status: 'exception: ' + String(e) });
        }
      }

      const failed = results.filter(r => r.status !== 'ok');
      console.log('bulk_sync done. failed:', failed.length);
      return new Response(JSON.stringify({ success: true, results, failed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── DELETE — hard-delete from profiles ──────────────────────
    if (action === 'delete') {
      const { local_id } = body;
      const { error: credErr } = await supabaseAdmin.from('user_credentials').delete().eq('local_id', local_id);
      if (credErr) console.warn('user_credentials delete warn:', credErr.message);
      const { error: profileErr } = await supabaseAdmin.from('profiles').delete().eq('local_id', local_id);
      if (profileErr) throw new Error('Failed to delete profile: ' + profileErr.message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── DEACTIVATE (legacy) ──────────────────────────────────────
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
