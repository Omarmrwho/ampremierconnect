import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const openClawWebUrl =
  process.env.OPENCLAW_WEB_URL ||
  process.env.VITE_OPENCLAW_WEB_URL ||
  'https://arrived-launch-roy-combined.trycloudflare.com/'
const openClawGatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || process.env.GATEWAY_AUTH_TOKEN

const json = (response: any, status: number, payload: unknown) => {
  response.status(status).json(payload)
}

const getBearerToken = (header: string | undefined) => {
  const match = String(header || '').match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

const buildOpenClawUrl = () => {
  const url = new URL(openClawWebUrl)

  if (!url.pathname || url.pathname === '/') {
    url.pathname = '/chat'
    url.searchParams.set('session', 'main')
  }

  if (openClawGatewayToken) {
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
    hashParams.set('token', openClawGatewayToken)
    url.hash = hashParams.toString()
  }

  return url.toString()
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    json(response, 405, { error: 'Method not allowed.' })
    return
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    json(response, 500, { error: 'OpenClaw link API is missing Supabase environment configuration.' })
    return
  }

  const accessToken = getBearerToken(request.headers.authorization)
  if (!accessToken) {
    json(response, 401, { error: 'Missing portal session.' })
    return
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(accessToken)

  if (userError || !user) {
    json(response, 401, { error: 'Portal session could not be verified.' })
    return
  }

  const { data: profile, error: profileError } = await userClient
    .from('portal_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'internal') {
    json(response, 403, { error: 'Only internal users can open the OpenClaw workspace.' })
    return
  }

  if (!openClawGatewayToken) {
    json(response, 500, { error: 'OpenClaw gateway token is not configured on the server.' })
    return
  }

  response.setHeader('Cache-Control', 'private, no-store')
  json(response, 200, { url: buildOpenClawUrl() })
}
