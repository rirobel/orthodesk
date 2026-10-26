import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, password } = await req.json()

    if (!token || !password || String(password).length < 8) {
      return new Response(JSON.stringify({ error: 'Token ou mot de passe invalide.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('password_reset_requests')
      .select('*')
      .eq('token', token)
      .single()

    if (requestError || !requestData) {
      return new Response(JSON.stringify({ error: 'Token invalide.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (requestData.used || new Date(requestData.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'Token expiré ou déjà utilisé.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(requestData.user_id, {
      password,
    })

    if (updateUserError) {
      return new Response(JSON.stringify({ error: updateUserError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabaseAdmin
      .from('password_reset_requests')
      .update({ used: true })
      .eq('id', requestData.id)

    return new Response(JSON.stringify({ ok: true, message: 'Mot de passe mis à jour.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('confirm-password-reset error:', error)
    return new Response(JSON.stringify({ error: 'Erreur serveur.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
