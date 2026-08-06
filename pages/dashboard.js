import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)

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

  const iconMap = { puzzle: '🧩', clock: '⏰', heart: '❤️', globe: '🌐', counter: '🔢', chart: '📊', star: '⭐', layout: '📋' }

  function getIcon(icon) { return iconMap[icon] || '🧩' }

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
          <div style={styles.grid}>
            {plugins.map(p => (
              <div key={p.id} onClick={() => router.push(`/plugin/${p.id}`)} style={styles.card}>
                <div style={styles.cardIcon}>{getIcon(p.icon)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.cardName}>{p.name}</div>
                  <div style={styles.cardId}>{p.id}</div>
                  {p.description && <div style={styles.cardDesc}>{p.description}</div>}
                </div>
                <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6 }}>
                  <span style={styles.badge}>{p.type || 'widget'}</span>
                  <span style={{ fontSize:10, color:'#64748b' }}>v{p.version}</span>
                  {p.hasHtml && <span style={{ fontSize:10, color:'#4ade80' }}>HTML</span>}
                </div>
              </div>
            ))}
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
  btnOutline: { padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:500, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer' },
  btnPrimary: { padding:'10px 20px', borderRadius:8, fontSize:13, fontWeight:600, border:'none', background:'#3b82f6', color:'#fff', cursor:'pointer' },
  empty: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:100 },
  grid: {
    display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16, padding:24,
    maxWidth:1200, margin:'0 auto',
  },
  card: {
    background:'#1e293b', borderRadius:12, border:'1px solid #334155', padding:20,
    display:'flex', alignItems:'center', gap:16, cursor:'pointer', transition:'border-color .15s',
  },
  cardIcon: { fontSize: 32, flexShrink: 0 },
  cardName: { fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardId: { fontSize: 11, color: '#64748b', fontFamily: 'monospace' },
  cardDesc: { fontSize: 12, color: '#94a3b8', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  badge: { fontSize: 10, background: '#334155', color: '#94a3b8', padding: '2px 8px', borderRadius: 99 },
}
