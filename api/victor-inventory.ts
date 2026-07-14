import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const inventoryPath = path.join(process.cwd(), 'data', 'victor-generator-inventory.json')

const json = (response: any, status: number, payload: unknown) => {
  response.status(status).json(payload)
}

const getBearerToken = (header: string | undefined) => {
  const match = String(header || '').match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    json(response, 405, { error: 'Method not allowed.' })
    return
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    json(response, 500, { error: 'Inventory API is missing Supabase environment configuration.' })
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
    json(response, 403, { error: 'Only internal users can view generator inventory.' })
    return
  }

  if (!fs.existsSync(inventoryPath)) {
    json(response, 404, { error: 'Generator inventory has not been synced yet.' })
    return
  }

  response.setHeader('Cache-Control', 'private, no-store')
  json(response, 200, JSON.parse(fs.readFileSync(inventoryPath, 'utf8')))
}
