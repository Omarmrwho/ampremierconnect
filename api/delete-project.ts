import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

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

  const missingEnvironment = [
    !supabaseUrl ? 'VITE_SUPABASE_URL or SUPABASE_URL' : '',
    !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY' : '',
    !serviceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY' : '',
  ].filter(Boolean)

  if (missingEnvironment.length > 0) {
    json(response, 500, {
      error: `Workspace delete is not configured on the server. Missing Vercel environment variable: ${missingEnvironment.join(', ')}.`,
    })
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
  const projectName = String(request.body?.projectName || '').trim()
  const deleteByName = Boolean(request.body?.deleteByName)
  if (!projectId && !projectName) {
    json(response, 400, { error: 'Project id or project name is required.' })
    return
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: projects, error: lookupError } = deleteByName && projectName
    ? await adminClient.from('project_session_status').select('id').eq('project_name', projectName)
    : await adminClient.from('project_session_status').select('id').eq('id', projectId)

  if (lookupError) {
    json(response, 500, { error: lookupError.message })
    return
  }

  const projectIds = (projects || []).map((project) => project.id)
  if (projectIds.length === 0) {
    json(response, 404, { error: 'No matching workspace records were found to delete.', deleted: 0, deletedIds: [] })
    return
  }

  const childTables = [
    'project_campaign_activities',
    'project_crm_records',
    'project_tasks',
    'project_campaigns',
    'project_proposals',
    'project_ideas',
    'project_agent_recommendations',
  ]

  for (const table of childTables) {
    const { error: childError } = await adminClient.from(table).delete().in('project_id', projectIds)
    if (childError) {
      json(response, 500, { error: `${table}: ${childError.message}` })
      return
    }
  }

  const { data: deletedProjects, error } = await adminClient
    .from('project_session_status')
    .delete()
    .in('id', projectIds)
    .select('id')

  if (error) {
    json(response, 500, { error: error.message })
    return
  }

  const deletedIds = (deletedProjects || []).map((project) => project.id)
  if (deletedIds.length === 0) {
    json(response, 500, { error: 'Delete request completed but Supabase returned zero deleted rows.', deleted: 0, deletedIds: [] })
    return
  }

  json(response, 200, { ok: true, deleted: deletedIds.length, deletedIds })
}
