import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function PluginDetail() {
  const router = useRouter()
  const { id } = router.query

  const [manifest, setManifest] = useState(null)
  const [html, setHtml] = useState('')
  const [editManifest, setEditManifest] = useState(null)
  const [editHtml, setEditHtml] = useState('')
  const [mode, setMode] = useState('preview')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [manifestUrl, setManifestUrl] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    loadPlugin()
  }, [id])

  async function loadPlugin() {
    setLoading(true)
    try {
      const res = await fetch(`/api/plugins/${id}/manifest`)
      if (res.ok) {
        const m = await res.json()
        setManifest(m)
        setEditManifest({ ...m, base_url: undefined })
        setManifestUrl(`${window.location.origin}/api/plugins/${id}/manifest`)
      } else {
        setManifest({ name: id, id, type: 'widget', icon: 'puzzle', author: '', description: '', slots: 'dashboard', version: '1.0.0' })
        setEditManifest({ name: id, id, type: 'widget', icon: 'puzzle', author: '', description: '', slots: 'dashboard', version: '1.0.0' })
      }

      const htmlSources = [
        `/plugins/${id}/index.html`,
        `/plugins/${id}/public/index.html`,
      ]
      for (const src of htmlSources) {
        try {
          const r = await fetch(src)
          if (r.ok) { const t = await r.text(); setHtml(t); setEditHtml(t); break }
        } catch { }
      }
    } catch { }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/plugins/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, manifest: editManifest, html: editHtml }),
      })
      if (res.ok) {
        setManifest(editManifest)
        setHtml(editHtml)
        setSaved(true)
        setManifestUrl(`${window.location.origin}/api/plugins/${id}/manifest`)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch { }
    setSaving(false)
  }

  function handleManifestChange(key, value) {
    setEditManifest(prev => ({ ...prev, [key]: value }))
  }

  const previewSrc = editHtml
    ? `data:text/html;charset=utf-8,${encodeURIComponent(editHtml)}`
    : html ? `data:text/html;charset=utf-8,${encodeURIComponent(html)}` : null

  const iconMap = { puzzle: '🧩', clock: '⏰', heart: '❤️', globe: '🌐', counter: '🔢', chart: '📊', star: '⭐' }

  if (loading || !id) {
    return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:14,color:'#94a3b8' }}>Cargando...</div>
  }

  return (
    <>
      <Head><title>{manifest?.name || id} - Plugin Sandbox</title></Head>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
        <div style={styles.toolbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.push('/dashboard')} style={styles.tbBtn}>← Back</button>
            <span style={{ fontSize: 20 }}>{iconMap[manifest?.icon] || '🧩'}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>{manifest?.name || id}</span>
            <span style={{ fontSize: 11, color: '#64748b', padding: '2px 8px', background: '#1e293b', borderRadius: 99 }}>v{manifest?.version || '1.0.0'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMode('preview')} style={mode === 'preview' ? styles.tbBtnActive : styles.tbBtn}>
              Preview
            </button>
            <button onClick={() => setMode('editor')} style={mode === 'editor' ? styles.tbBtnActive : styles.tbBtn}>
              Editor
            </button>
            {saved && <span style={{ fontSize: 12, color: '#4ade80', display: 'flex', alignItems: 'center' }}>Guardado</span>}
            <button onClick={handleSave} disabled={saving} style={styles.tbSave}>
              {saving ? '...' : 'Save'}
            </button>
            {manifestUrl && (
              <button onClick={() => navigator.clipboard.writeText(manifestUrl)} style={styles.tbBtn} title="Copiar URL del manifest">
                Copy URL
              </button>
            )}
          </div>
        </div>

        {mode === 'preview' ? (
          <div style={{ flex: 1, background: '#fff' }}>
            <div style={styles.publishBar}>
              <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
                <span style={{ fontSize:11,fontWeight:600,color:'#94a3b8' }}>Publicar en WLO:</span>
                <span style={{ fontSize:10,color:'#64748b' }}>URL base</span>
                <code style={styles.pubCode}>{typeof window !== 'undefined' ? window.location.origin : ''}</code>
                <button onClick={() => { navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.origin : '') }} style={styles.pubCopy}>Copiar</button>
                <span style={{ fontSize:10,color:'#64748b' }}>Ruta embed</span>
                <code style={styles.pubCode}>/embed/{id}</code>
                <button onClick={() => { navigator.clipboard.writeText(`/embed/${id}`) }} style={styles.pubCopy}>Copiar</button>
                <span style={{ fontSize:11,color:'#64748b',marginLeft:8 }}>| Manifest:</span>
                <code style={styles.pubCode}>{manifestUrl || `/api/plugins/${id}/manifest`}</code>
                <button onClick={() => { navigator.clipboard.writeText(manifestUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/plugins/${id}/manifest`) }} style={styles.pubCopy}>Copiar</button>
              </div>
            </div>
            {previewSrc ? (
              <iframe src={previewSrc} sandbox="allow-scripts" style={{ width: '100%', height: '100%', border: 'none' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: 14 }}>
                Sin contenido HTML. Ve al Editor para crear el plugin.
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ width: 400, background: '#1e293b', padding: 20, overflow: 'auto', borderRight: '1px solid #334155' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>Manifest</h3>
              {editManifest && Object.keys(editManifest).filter(k => !['base_url'].includes(k)).map(k => (
                <div key={k} style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>{k}</label>
                  <input
                    value={editManifest[k]}
                    onChange={e => handleManifestChange(k, e.target.value)}
                    style={styles.editorInput}
                  />
                </div>
              ))}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>HTML</span>
              </div>
              <textarea
                value={editHtml}
                onChange={e => setEditHtml(e.target.value)}
                style={{ flex: 1, background: '#0f172a', color: '#e2e8f0', border: 'none', padding: 16, fontFamily: 'monospace', fontSize: 13, resize: 'none', outline: 'none', lineHeight: 1.6 }}
                spellCheck={false}
              />
            </div>
            <div style={{ width: '40%', borderLeft: '1px solid #334155', background: '#f8fafc' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Live Preview</span>
              </div>
              {previewSrc ? (
                <iframe src={previewSrc} sandbox="allow-scripts" style={{ width: '100%', height: 'calc(100% - 40px)', border: 'none' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 40px)', color: '#94a3b8', fontSize: 13 }}>
                  Escribe HTML para ver la previsualizacion
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const styles = {
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 20px', background: '#0f172a', borderBottom: '1px solid #1e293b',
  },
  tbBtn: {
    padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
    border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer',
  },
  tbBtnActive: {
    padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
    border: '1px solid #3b82f6', background: '#1e3a5f', color: '#60a5fa', cursor: 'pointer',
  },
  tbSave: {
    padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
    border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer',
  },
  editorInput: {
    width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 12,
    border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', outline: 'none',
    boxSizing: 'border-box',
  },
  publishBar: {
    padding: '8px 16px', background: '#1e293b', borderBottom: '1px solid #334155',
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4,
  },
  pubCode: {
    fontSize: 11, color: '#60a5fa', background: '#0f172a', padding: '3px 8px', borderRadius: 4, fontFamily: 'monospace',
  },
  pubCopy: {
    padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500,
    border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer',
  },
}
