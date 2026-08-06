import { createClient } from '@supabase/supabase-js'

const supabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase().storage.from('flows').list('', { sortBy: { column: 'updated_at', order: 'desc' } })
    if (error) return res.status(500).json({ error: error.message })

    const flows = await Promise.all((data || [])
      .filter(f => f.name.endsWith('.json'))
      .map(async f => {
        try {
          const { data: file } = await supabase().storage.from('flows').download(f.name)
          const json = JSON.parse(await file.text())
          return { id: f.name.replace('.json', ''), ...json, _updated: f.updated_at }
        } catch { return null }
      }))
    return res.json(flows.filter(Boolean))
  }

  if (req.method === 'POST') {
    const { title, description } = req.body || {}
    const id = `flow-${Date.now()}`
    const flow = { id, title: title || 'Nuevo flujo', description: description || '', nodes: [], edges: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(flow)], { type: 'application/json' })
    const { error } = await supabase().storage.from('flows').upload(`${id}.json`, blob, { upsert: true, contentType: 'application/json' })
    if (error) return res.status(500).json({ error: error.message })
    return res.json(flow)
  }
}
