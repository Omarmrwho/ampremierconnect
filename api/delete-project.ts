import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const json = (response: any, status: number, payload: unknown) => {
  response.status(status).json(payload)
}

const getBearerToken = (header: string | undefined) => {
  const match = String(header || '').match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    json(response, 405, { error: 'Method not allowed.' })
    return
  }

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    json(response, 500, { error: 'Supabase server environment variables are not configured.' })
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
    json(response, 403, { error: 'Only internal users can delete workspaces.' })
    return
  }

  const projectId = String(request.body?.projectId || '').trim()
  if (!projectId) {
    json(response, 400, { error: 'Project id is required.' })
    return
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { error } = await adminClient.from('project_session_status').delete().eq('id', projectId)

  if (error) {
    json(response, 500, { error: error.message })
    return
  }

  json(response, 200, { ok: true })
}
