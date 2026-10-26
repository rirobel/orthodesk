import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizePhone(value: string) {
  return String(value || '').replace(/\s+/g, '').trim()
}

async function sendTwilioSms(to: string, body: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_FROM')

  if (!accountSid || !authToken || !from) {
    return { sent: false, reason: 'TWILIO_NOT_CONFIGURED' }
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: to,
      From: from,
      Body: body,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Twilio SMS failed: ${response.status} ${text}`)
  }

  return { sent: true }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, phone } = await req.json()

    if (!email || !phone) {
      return new Response(JSON.stringify({ error: 'Email et téléphone requis.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedPhone = normalizePhone(phone)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { data: usersData, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers()
    if (listUsersError) {
      throw listUsersError
    }

    const user = usersData.users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase())

    if (!user) {
      return new Response(JSON.stringify({ ok: true, message: 'Si les informations sont valides, un code de validation vous sera envoyé.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('telephone')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ ok: true, message: 'Si les informations sont valides, un code de validation vous sera envoyé.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (normalizePhone(String(profile.telephone || '')) !== normalizedPhone) {
      return new Response(JSON.stringify({ ok: true, message: 'Si les informations sont valides, un code de validation vous sera envoyé.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = crypto.randomUUID()
    const smsCode = token
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: insertError } = await supabaseAdmin
      .from('password_reset_requests')
      .insert({
        user_id: user.id,
        email: user.email,
        phone: normalizedPhone,
        token,
        expires_at: expiresAt,
      })

    if (insertError) {
      throw insertError
    }

    let smsSent = false
    const debugMode = Deno.env.get('ALLOW_DEBUG_RESET_TOKEN') === 'true' || Deno.env.get('APP_ENV') === 'development'

    try {
      const twilioResult = await sendTwilioSms(normalizedPhone, `Votre code de validation OrthoDesk : ${smsCode}`)
      smsSent = twilioResult.sent
    } catch (smsError) {
      console.error('Twilio SMS error:', smsError)
      smsSent = false
    }

    const responsePayload: Record<string, unknown> = {
      ok: true,
      message: 'Si les informations sont valides, un code de validation vous sera envoyé.',
      sms_sent: smsSent,
    }

    if (debugMode && !smsSent) {
      responsePayload.token = token
      responsePayload.debug_code = smsCode
    }

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('request-password-reset error:', error)
    return new Response(JSON.stringify({ error: 'Erreur serveur.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
