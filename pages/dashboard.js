import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    import('@supabase/supabase-js').then(({ createClient }) => {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) router.push('/')
        else {
          setUser(session.user)
          fetch('/api/plugins/list')
            .then(r => r.json())
            .then(data => { setPlugins(data); setLoading(false) })
            .catch(() => setLoading(false))
        }
      })
    })
  }, [])

  function logout() {
    import('@supabase/supabase-js').then(({ createClient }) => {
      createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).auth.signOut().then(() => router.push('/'))
    })
  }

  function handleCopy(text, id) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const iconMap = { puzzle: '🧩', clock: '⏰', heart: '❤️', globe: '🌐', counter: '🔢', chart: '📊', star: '⭐', layout: '📋' }
  function getIcon(icon) { return iconMap[icon] || '🧩' }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <>
      <Head><title>Dashboard - Plugin Sandbox</title></Head>
      <div style={{ minHeight:'100vh', background:'#0f172a' }}>
        <div style={styles.header}>
          <div style={{ display:'flex',alignItems:'center',gap:16 }}>
            <h1 style={{ fontSize:18, fontWeight:700, color:'#e2e8f0' }}>Plugin Sandbox</h1>
            <span style={{ fontSize:11, color:'#64748b', background:'#1e293b', padding:'2px 8px', borderRadius:99 }}>
              {plugins.length} plugins
            </span>
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <span style={{ fontSize:13, color:'#64748b' }}>{user?.email}</span>
            <button onClick={logout} style={styles.btnOutline}>Salir</button>
          </div>
        </div>

        <div style={styles.helpBanner}>
          <div style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
            <span style={{ fontSize:20 }}>📋</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', marginBottom:4 }}>Como publicar en WLO</div>
              <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.6 }}>
                Cada plugin tiene dos URLs. Copialas y llevalas al Marketplace de WLO:
              </div>
              <div style={{ display:'flex',gap:24,marginTop:8 }}>
                <div>
                  <span style={{ fontSize:10, color:'#64748b', background:'#1e293b', padding:'2px 6px', borderRadius:4, fontFamily:'monospace' }}>URL base</span>
                  <span style={{ fontSize:11, color:'#94a3b8', marginLeft:6 }}>La raiz de este sandbox (se registra una sola vez)</span>
                </div>
                <div>
                  <span style={{ fontSize:10, color:'#64748b', background:'#1e293b', padding:'2px 6px', borderRadius:4, fontFamily:'monospace' }}>Ruta embed</span>
                  <span style={{ fontSize:11, color:'#94a3b8', marginLeft:6 }}>La pagina que WLO va a enmarcar para cada plugin</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:80,color:'#64748b' }}>
            Cargando plugins...
          </div>
        ) : plugins.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize:48, marginBottom:16 }}>📦</div>
            <h2 style={{ fontSize:18, fontWeight:600, color:'#e2e8f0', marginBottom:8 }}>No hay plugins</h2>
            <p style={{ fontSize:13, color:'#64748b', marginBottom:24 }}>Copia una carpeta de plugin en public/plugins/ para empezar.</p>
            <button onClick={() => router.push('/plugin/wlo-nuevo-plugin')} style={styles.btnPrimary}>
              Crear nuevo
            </button>
          </div>
        ) : (
          <div style={{ padding:24, maxWidth:1000, margin:'0 auto' }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:16 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>Plugins disponibles</span>
              <span style={{ fontSize:11, color:'#64748b' }}>Haz clic en un plugin para previsualizarlo a pantalla completa</span>
            </div>

            {/* Flows - herramienta standalone */}
            <div style={{ ...styles.pluginCard, background:'#1e3a5f', border:'1px solid #2563eb' }}>
              <div style={{ display:'flex',alignItems:'flex-start',gap:16 }}>
                <div style={{ fontSize:32, flexShrink:0, cursor:'pointer' }} onClick={() => router.push('/embed/flow')}>📊</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                    <span style={{ fontSize:15, fontWeight:600, color:'#e2e8f0', cursor:'pointer' }} onClick={() => router.push('/embed/flow')}>Flows</span>
                    <span style={{ ...styles.badge, background:'#2563eb', color:'#93c5fd' }}>standalone</span>
                    <span style={{ fontSize:10, color:'#60a5fa' }}>React Flow</span>
                  </div>
                  <div style={{ fontSize:12, color:'#94a3b8', marginBottom:10 }}>Editor de diagramas con nodos, figuras, conexiones. Exporta/importa JSON.</div>
                  <div style={styles.urlSection}>
                    <div style={styles.urlLabel}>Para WLO Marketplace</div>
                    <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                      <div style={styles.urlRow}>
                        <span style={styles.urlTag}>URL base</span>
                        <code style={styles.urlCode}>{origin}</code>
                        <button onClick={() => handleCopy(origin, 'flows-base')} style={styles.copyBtn}>{copied === 'flows-base' ? 'Copiado' : 'Copiar'}</button>
                      </div>
                      <div style={styles.urlRow}>
                        <span style={styles.urlTag}>Ruta embed</span>
                        <code style={styles.urlCode}>/embed/flow</code>
                        <button onClick={() => handleCopy('/embed/flow', 'flows-embed')} style={styles.copyBtn}>{copied === 'flows-embed' ? 'Copiado' : 'Copiar'}</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {plugins.filter(p => p.hasHtml).map(p => {
              const embedUrl = `${origin}/embed/${p.id}`
              const manifestUrl = `${origin}/api/plugins/${p.id}/manifest`
              const wloUrlBase = origin
              const wloEmbedPath = `/embed/${p.id}`
              return (
                <div key={p.id} style={styles.pluginCard}>
                  <div style={{ display:'flex',alignItems:'flex-start',gap:16 }}>
                    <div style={{ fontSize:32, flexShrink:0, cursor:'pointer' }} onClick={() => router.push(`/plugin/${p.id}`)}>
                      {getIcon(p.icon)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                        <span style={{ fontSize:15, fontWeight:600, color:'#e2e8f0', cursor:'pointer' }} onClick={() => router.push(`/plugin/${p.id}`)}>
                          {p.name}
                        </span>
                        <span style={styles.badge}>{p.type || 'widget'}</span>
                        <span style={{ fontSize:10, color:'#64748b' }}>v{p.version}</span>
                        {p.hasHtml && <span style={{ fontSize:10, color:'#4ade80' }}>embed</span>}
                      </div>
                      {p.description && <div style={{ fontSize:12, color:'#94a3b8', marginBottom:10 }}>{p.description}</div>}

                      <div style={styles.urlSection}>
                        <div style={styles.urlLabel}>Para WLO Marketplace</div>
                        <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                          <div style={styles.urlRow}>
                            <span style={styles.urlTag}>URL base</span>
                            <code style={styles.urlCode}>{wloUrlBase}</code>
                            <button onClick={() => handleCopy(wloUrlBase, `base-${p.id}`)} style={styles.copyBtn}>
                              {copied === `base-${p.id}` ? 'Copiado' : 'Copiar'}
                            </button>
                          </div>
                          <div style={styles.urlRow}>
                            <span style={styles.urlTag}>Ruta embed</span>
                            <code style={styles.urlCode}>{wloEmbedPath}</code>
                            <button onClick={() => handleCopy(wloEmbedPath, `embed-${p.id}`)} style={styles.copyBtn}>
                              {copied === `embed-${p.id}` ? 'Copiado' : 'Copiar'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div style={styles.urlSection} onClick={e => e.stopPropagation()}>
                        <div style={styles.urlLabel}>URLs directas</div>
                        <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                          <div style={styles.urlRow}>
                            <span style={styles.urlTag}>Embed</span>
                            <code style={styles.urlCode}>{embedUrl}</code>
                            <button onClick={() => handleCopy(embedUrl, `embed-${p.id}`)} style={styles.copyBtn}>
                              {copied === `embed-${p.id}` ? 'Copiado' : 'Copiar'}
                            </button>
                          </div>
                          <div style={styles.urlRow}>
                            <span style={styles.urlTag}>Manifest</span>
                            <code style={styles.urlCode}>{manifestUrl}</code>
                            <button onClick={() => handleCopy(manifestUrl, `manifest-${p.id}`)} style={styles.copyBtn}>
                              {copied === `manifest-${p.id}` ? 'Copiado' : 'Copiar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {plugins.some(p => !p.hasHtml) && (
              <div style={{ marginTop:24 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#94a3b8', marginBottom:8 }}>
                  Componentes internos (sin HTML, no se embeben)
                </div>
                {plugins.filter(p => !p.hasHtml).map(p => (
                  <div key={p.id} style={{ ...styles.pluginCard, background:'#151f2e', opacity:0.7 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                      <span style={{ fontSize:24 }}>{getIcon(p.icon)}</span>
                      <div>
                        <span style={{ fontSize:14, fontWeight:600, color:'#94a3b8' }}>{p.name}</span>
                        <span style={{ fontSize:10, color:'#64748b', marginLeft:8 }}>{p.id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

const styles = {
  header: {
    background:'#0f172a', borderBottom:'1px solid #1e293b', padding:'14px 24px',
    display:'flex', alignItems:'center', justifyContent:'space-between',
  },
  helpBanner: {
    background:'#1e293b', borderBottom:'1px solid #334155', padding:'16px 24px',
    maxWidth:1000, margin:'0 auto',
  },
  btnOutline: { padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:500, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer' },
  btnPrimary: { padding:'10px 20px', borderRadius:8, fontSize:13, fontWeight:600, border:'none', background:'#3b82f6', color:'#fff', cursor:'pointer' },
  empty: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:100 },
  pluginCard: {
    background:'#1e293b', borderRadius:12, border:'1px solid #334155', padding:20,
    marginBottom:12,
  },
  badge: { fontSize:10, background:'#334155', color:'#94a3b8', padding:'2px 8px', borderRadius:99 },
  urlSection: { marginTop:10, paddingTop:10, borderTop:'1px solid #334155' },
  urlLabel: { fontSize:10, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 },
  urlRow: { display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' },
  urlTag: { fontSize:10, color:'#64748b', background:'#0f172a', padding:'2px 6px', borderRadius:4, fontFamily:'monospace', minWidth:70, textAlign:'center' },
  urlCode: { fontSize:11, color:'#60a5fa', background:'#0f172a', padding:'4px 10px', borderRadius:6, fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  copyBtn: { padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:500, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer', whiteSpace:'nowrap' },
}
