import { createClient } from '@supabase/supabase-js'

const supabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'id required' })

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase().storage.from('flows').download(`${id}.json`)
      if (error) return res.status(404).json({ error: 'No encontrado' })
      const json = JSON.parse(await data.text())
      return res.json(json)
    } catch { return res.status(404).json({ error: 'No encontrado' }) }
  }

  if (req.method === 'PATCH') {
    try {
      const body = req.body
      const { data: existing } = await supabase().storage.from('flows').download(`${id}.json`)
      const current = existing ? JSON.parse(await existing.text()) : {}
      const updated = { ...current, ...body, updated_at: new Date().toISOString() }
      const blob = new Blob([JSON.stringify(updated)], { type: 'application/json' })
      const { error } = await supabase().storage.from('flows').upload(`${id}.json`, blob, { upsert: true, contentType: 'application/json' })
      if (error) return res.status(500).json({ error: error.message })
      return res.json(updated)
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase().storage.from('flows').remove([`${id}.json`])
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }
}
