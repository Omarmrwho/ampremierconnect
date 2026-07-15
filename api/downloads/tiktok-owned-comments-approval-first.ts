import fs from 'fs'
import path from 'path'

const workflowFilePath = path.resolve(process.cwd(), 'public', 'downloads', 'tiktok-owned-comments-approval-first.json')

export default function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  if (!fs.existsSync(workflowFilePath)) {
    response.status(404).json({ error: 'Workflow download is not available.' })
    return
  }

  const workflowJson = fs.readFileSync(workflowFilePath, 'utf8')

  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Content-Disposition', 'attachment; filename="tiktok-owned-comments-approval-first.json"')
  response.status(200).send(workflowJson)
}
