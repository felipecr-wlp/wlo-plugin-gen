import { createClient } from '@supabase/supabase-js'

const supabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function scopePath(workspaceId, suffix) {
  const ws = workspaceId || 'demo'
  return `flows/${ws}/${suffix}`
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const { id } = req.query
  const workspaceId = req.query.workspace_id || 'demo'
  if (!id) return res.status(400).json({ error: 'id required' })
  const path = scopePath(workspaceId, `${id}.json`)

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase().storage.from('flows').download(path)
      if (error) return res.status(404).json({ error: 'No encontrado' })
      const json = JSON.parse(await data.text())
      return res.json(json)
    } catch { return res.status(404).json({ error: 'No encontrado' }) }
  }

  if (req.method === 'PATCH') {
    try {
      const body = req.body
      let current = {}
      try { const { data: existing } = await supabase().storage.from('flows').download(path); if (existing) current = JSON.parse(await existing.text()) } catch { }
      const updated = { ...current, ...body, updated_at: new Date().toISOString() }
      const blob = new Blob([JSON.stringify(updated)], { type: 'application/json' })
      const { error } = await supabase().storage.from('flows').upload(path, blob, { upsert: true, contentType: 'application/json' })
      if (error) return res.status(500).json({ error: error.message })
      return res.json(updated)
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase().storage.from('flows').remove([path])
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }
}
