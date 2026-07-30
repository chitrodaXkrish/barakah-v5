import { createClient } from 'npm:@supabase/supabase-js@2'

const OTP_TTL_MINUTES = 10
const RESEND_COOLDOWN_SECONDS = 60
const MAX_ATTEMPTS = 5
const FROM_EMAIL = 'Barakah <no-reply@barakah.services>'
const SENDER_DOMAIN = 'barakah.services'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Action = 'request' | 'verify' | 'complete'
const USER_ROLES = new Set(['normal_user', 'seller', 'travel_partner'])

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

function generateOtp(): string {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return String(1000 + (values[0] % 9000))
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function hashCode(email: string, code: string, secret: string): Promise<string> {
  return sha256(`${email}:${code}:${secret}`)
}

function otpEmailHtml(code: string): string {
  return `
    <div style="font-family: Arial, sans-serif; background:#FFF5E5; padding:24px;">
      <div style="max-width:420px; margin:0 auto; background:#ffffff; border:1px solid #E8D2A8; border-radius:18px; padding:24px;">
        <h1 style="margin:0 0 12px; color:#2C1309; font-size:22px;">Confirm your email</h1>
        <p style="margin:0 0 18px; color:#8B6E4A; line-height:1.5;">Enter this 4-digit code in Barakah to finish creating your account.</p>
        <div style="font-size:34px; letter-spacing:12px; color:#A35233; font-weight:700; text-align:center; padding:18px 10px; background:#FFF2DF; border-radius:14px;">${code}</div>
        <p style="margin:18px 0 0; color:#8B6E4A; font-size:13px;">This code expires in ${OTP_TTL_MINUTES} minutes. If you did not request it, you can ignore this email.</p>
      </div>
    </div>
  `
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server configuration error' }, 500)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  const action = body.action as Action | undefined
  const email = normalizeEmail(body.email)

  if ((action !== 'request' && action !== 'verify' && action !== 'complete') || !email) {
    return json({ error: 'Invalid request' }, 400)
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const secret = serviceKey

  if (action === 'request') {
    const { data: existing } = await supabase
      .from('auth_email_otps')
      .select('last_sent_at')
      .eq('email', email)
      .maybeSingle()

    if (existing?.last_sent_at) {
      const secondsSinceLastSend = (Date.now() - new Date(existing.last_sent_at).getTime()) / 1000
      if (secondsSinceLastSend < RESEND_COOLDOWN_SECONDS) {
        return json({
          error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLastSend)} seconds before requesting another code.`,
        }, 429)
      }
    }

    const code = generateOtp()
    const codeHash = await hashCode(email, code, secret)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000)
    const messageId = crypto.randomUUID()

    const { error: otpError } = await supabase
      .from('auth_email_otps')
      .upsert({
        email,
        code_hash: codeHash,
        attempts: 0,
        last_sent_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        verified_at: null,
        updated_at: now.toISOString(),
      }, { onConflict: 'email' })

    if (otpError) {
      console.error('Failed to store OTP', otpError)
      return json({ error: 'Could not create verification code' }, 500)
    }

    const payload = {
      run_id: crypto.randomUUID(),
      message_id: messageId,
      idempotency_key: messageId,
      queued_at: now.toISOString(),
      to: email,
      from: FROM_EMAIL,
      sender_domain: SENDER_DOMAIN,
      subject: 'Your Barakah verification code',
      html: otpEmailHtml(code),
      text: `Your Barakah verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
      purpose: 'auth',
      label: 'signup_otp',
    }

    const { error: queueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'auth_emails',
      payload,
    })

    if (queueError) {
      console.error('Failed to enqueue OTP email', queueError)
      return json({ error: 'Could not send verification code' }, 500)
    }

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'signup_otp',
      recipient_email: email,
      status: 'pending',
    })

    return json({ ok: true, expiresInSeconds: OTP_TTL_MINUTES * 60 })
  }

  const code = typeof body.code === 'string' ? body.code.trim() : ''
  if (!/^\d{4}$/.test(code)) {
    return json({ error: 'Enter the 4-digit code' }, 400)
  }

  const { data: challenge, error: readError } = await supabase
    .from('auth_email_otps')
    .select('code_hash, attempts, expires_at')
    .eq('email', email)
    .maybeSingle()

  if (readError || !challenge) {
    return json({ error: 'Verification code not found. Please request a new code.' }, 404)
  }

  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    return json({ error: 'Verification code expired. Please request a new code.' }, 410)
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    return json({ error: 'Too many attempts. Please request a new code.' }, 429)
  }

  const submittedHash = await hashCode(email, code, secret)
  if (submittedHash !== challenge.code_hash) {
    await supabase
      .from('auth_email_otps')
      .update({
        attempts: challenge.attempts + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('email', email)

    return json({ error: 'Invalid verification code' }, 400)
  }

  await supabase
    .from('auth_email_otps')
    .update({
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('email', email)

  if (action === 'verify') {
    return json({ verified: true })
  }

  const password = typeof body.password === 'string' ? body.password : ''
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const role = typeof body.role === 'string' ? body.role : ''

  if (password.length < 6 || !fullName || !USER_ROLES.has(role)) {
    return json({ error: 'Invalid account details' }, 400)
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
    },
  })

  if (createError || !created.user) {
    const message = createError?.message || 'Could not create account'
    const lower = message.toLowerCase()
    const status = lower.includes('already') || lower.includes('registered') ? 409 : 500
    return json({ error: message }, status)
  }

  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({ user_id: created.user.id, role })

  if (roleError && roleError.code !== '23505') {
    console.error('Failed to store user role', roleError)
    return json({ error: 'Account created, but role setup failed' }, 500)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ user_id: created.user.id, full_name: fullName }, { onConflict: 'user_id' })

  if (profileError) {
    console.error('Failed to store profile', profileError)
    return json({ error: 'Account created, but profile setup failed' }, 500)
  }

  await supabase
    .from('auth_email_otps')
    .delete()
    .eq('email', email)

  return json({ created: true, role })
})
