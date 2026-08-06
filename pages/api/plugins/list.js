import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  try {
    const pluginsDir = path.join(process.cwd(), 'public', 'plugins')
    const plugins = []

    if (fs.existsSync(pluginsDir)) {
      const dirs = fs.readdirSync(pluginsDir).filter(d => {
        try { return fs.statSync(path.join(pluginsDir, d)).isDirectory() }
        catch { return false }
      })

      for (const dir of dirs) {
        try {
          const mPath = path.join(pluginsDir, dir, 'manifest.json')
          if (!fs.existsSync(mPath)) continue
          const manifest = JSON.parse(fs.readFileSync(mPath, 'utf-8'))
          const hasHtml = fs.existsSync(path.join(pluginsDir, dir, 'index.html'))
            || fs.existsSync(path.join(pluginsDir, dir, 'public', 'index.html'))
          plugins.push({ ...manifest, hasHtml, _local: true })
        } catch { }
      }
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json(plugins)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
