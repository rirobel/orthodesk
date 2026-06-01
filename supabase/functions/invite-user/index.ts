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
    // Vérifier que c'est bien l'admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: corsHeaders })
    }

    const { email } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email manquant' }), { status: 400, headers: corsHeaders })
    }

    // Client admin avec service_role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Vérifier que l'appelant est bien robel.maroc@gmail.com
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || user?.email !== 'robel.maroc@gmail.com') {
      return new Response(JSON.stringify({ error: 'Accès refusé' }), { status: 403, headers: corsHeaders })
    }

    // Envoyer l'invitation
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true, user: data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500, headers: corsHeaders })
  }
})