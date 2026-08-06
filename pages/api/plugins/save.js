import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { id, manifest, html } = req.body
    if (!id || !manifest) return res.status(400).json({ error: 'id and manifest required' })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const storageHost = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '')
    const m = {
      ...manifest,
      base_url: manifest.base_url || `https://${storageHost}/storage/v1/object/public/plugins/${id}/index.html`
    }

    if (html) {
      const htmlBlob = new Blob([html], { type: 'text/html' })
      await supabase.storage.from('plugins').upload(`${id}/index.html`, htmlBlob, { upsert: true, contentType: 'text/html' })
    }

    const manifestBlob = new Blob([JSON.stringify(m, null, 2)], { type: 'application/json' })
    await supabase.storage.from('plugins').upload(`${id}/manifest.json`, manifestBlob, { upsert: true, contentType: 'application/json' })

    res.json({ success: true, manifest_id: id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
