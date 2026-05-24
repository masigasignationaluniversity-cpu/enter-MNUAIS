const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Use env var URL, fallback to known URL
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') 
    || 'https://spb-t4nm8oi5k415koac.supabase.opentrust.net';
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ADMIN_UUID = 'ae76b0a7-a379-4c20-8ddd-b44d7bf11fd2';
  const NEW_PASSWORD = 'Admin@2025';

  console.log('setup-admin: URL =', SUPABASE_URL);
  console.log('setup-admin: SERVICE_ROLE_KEY present =', !!SERVICE_ROLE_KEY);

  if (!SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'SERVICE_ROLE_KEY not found' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const apiUrl = `${SUPABASE_URL}/auth/v1/admin/users/${ADMIN_UUID}`;
    console.log('Calling:', apiUrl);

    const res = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        password: NEW_PASSWORD,
        email_confirm: true,
        banned: false,
      }),
    });

    const responseText = await res.text();
    console.log('GoTrue response:', res.status, responseText.substring(0, 200));

    if (!res.ok) {
      throw new Error(`GoTrue ${res.status}: ${responseText}`);
    }

    return new Response(JSON.stringify({ success: true, status: res.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('setup-admin FAILED:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
