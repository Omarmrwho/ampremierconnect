import { createClient } from '@supabase/supabase-js'

type ChatMessage = {
  id: string
  request_type: string
  summary: string
  created_at: string
}

type ChatWebhookResponse = {
  reply?: string
  message?: string
  text?: string
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const openClawWebhookUrl = process.env.OPENCLAW_SITE_CHAT_WEBHOOK_URL
const openClawWebhookToken = process.env.OPENCLAW_SITE_CHAT_TOKEN

const json = (response: any, status: number, payload: unknown) => {
  response.status(status).json(payload)
}

const getBearerToken = (header: string | undefined) => {
  const match = String(header || '').match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

const getReplyText = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const data = payload as ChatWebhookResponse
  return String(data.reply || data.message || data.text || '').trim()
}

const loadMessages = async (client: any, userId: string) => {
  const { data, error } = await client
    .from('intake_requests')
    .select('id,request_type,summary,created_at')
    .eq('requester_id', userId)
    .in('request_type', ['site_chat_message', 'site_chat_reply'])
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as ChatMessage[]
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    json(response, 405, { error: 'Method not allowed.' })
    return
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    json(response, 500, { error: 'Supabase environment variables are not configured.' })
    return
  }

  const accessToken = getBearerToken(request.headers.authorization)
  if (!accessToken) {
    json(response, 401, { error: 'Missing portal session.' })
    return
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(accessToken)

  if (userError || !user) {
    json(response, 401, { error: 'Portal session could not be verified.' })
    return
  }

  const message = String(request.body?.message || '').trim()
  const company = String(request.body?.company || 'AM Premier Connect').trim()

  if (!message) {
    json(response, 400, { error: 'Message is required.' })
    return
  }

  const { error: insertError } = await client.from('intake_requests').insert({
    requester_id: user.id,
    request_type: 'site_chat_message',
    company,
    summary: message,
    status: 'draft',
  })

  if (insertError) {
    json(response, 500, { error: 'Message could not be saved.' })
    return
  }

  let reply = ''
  let bridgeStatus: 'connected' | 'not_configured' | 'failed' = 'not_configured'

  if (openClawWebhookUrl) {
    try {
      const bridgeResponse = await fetch(openClawWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(openClawWebhookToken ? { Authorization: `Bearer ${openClawWebhookToken}` } : {}),
        },
        body: JSON.stringify({
          source: 'ampremierconnect.com/chat',
          user_id: user.id,
          email: user.email,
          company,
          message,
        }),
      })

      if (bridgeResponse.ok) {
        bridgeStatus = 'connected'
        reply = getReplyText(await bridgeResponse.json().catch(() => null))
      } else {
        bridgeStatus = 'failed'
      }
    } catch {
      bridgeStatus = 'failed'
    }
  }

  if (reply) {
    await client.from('intake_requests').insert({
      requester_id: user.id,
      request_type: 'site_chat_reply',
      company,
      summary: reply,
      status: 'draft',
    })
  }

  const messages = await loadMessages(client, user.id)

  json(response, 200, {
    bridgeStatus,
    messages,
  })
}
