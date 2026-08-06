import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  const { id } = req.query

  try {
    const localPath = path.join(process.cwd(), 'public', 'plugins', id, 'manifest.json')
    if (fs.existsSync(localPath)) {
      const manifest = JSON.parse(fs.readFileSync(localPath, 'utf-8'))
      res.setHeader('Access-Control-Allow-Origin', '*')
      return res.json(manifest)
    }
  } catch { }

  try {
    const url = `https://hfnarzhpmawsdleulxxr.supabase.co/storage/v1/object/public/plugins/${id}/manifest.json`
    const response = await fetch(url)
    if (!response.ok) return res.status(404).json({ error: 'Manifest no encontrado' })
    const manifest = await response.json()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json(manifest)
  } catch {
    res.status(404).json({ error: 'Manifest no encontrado' })
  }
}
