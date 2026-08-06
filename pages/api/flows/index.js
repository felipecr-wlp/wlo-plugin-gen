import { createClient } from '@supabase/supabase-js'

const supabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function scopePath(workspaceId, suffix) {
  const ws = workspaceId || 'demo'
  return suffix ? `flows/${ws}/${suffix}` : `flows/${ws}`
}

export default async function handler(req, res) {
  const workspaceId = req.query.workspace_id || 'demo'

  if (req.method === 'GET') {
    const prefix = scopePath(workspaceId, '')
    const { data, error } = await supabase().storage.from('flows').list(prefix, { sortBy: { column: 'updated_at', order: 'desc' } })
    if (error) return res.status(500).json({ error: error.message })

    const flows = await Promise.all((data || [])
      .filter(f => f.name.endsWith('.json'))
      .map(async f => {
        try {
          const path = `flows/${workspaceId}/${f.name}`
          const { data: file } = await supabase().storage.from('flows').download(path)
          const json = JSON.parse(await file.text())
          return { id: f.name.replace('.json', ''), ...json, _updated: f.updated_at }
        } catch { return null }
      }))
    return res.json(flows.filter(Boolean))
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'object' ? req.body : {}
    const { title, description } = body
    const id = `flow-${Date.now()}`
    const flow = { id, title: title || 'Nuevo flujo', description: description || '', nodes: [], edges: [], workspace_id: workspaceId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(flow)], { type: 'application/json' })
    const path = scopePath(workspaceId, `${id}.json`)
    const { error } = await supabase().storage.from('flows').upload(path, blob, { upsert: true, contentType: 'application/json' })
    if (error) return res.status(500).json({ error: error.message })
    return res.json(flow)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
