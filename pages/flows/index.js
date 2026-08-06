import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { ArrowLeft, Plus, PenTool, Trash2 } from 'lucide-react'

export default function FlowsList() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [flows, setFlows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    import('@supabase/supabase-js').then(({ createClient }) => {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) router.push('/')
        else { setUser(session.user); loadFlows() }
      })
    })
  }, [])

  async function loadFlows() {
    try {
      const r = await fetch('/api/flows')
      if (r.ok) setFlows(await r.json())
    } catch { }
    setLoading(false)
  }

  async function createFlow() {
    try {
      const r = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nuevo flujo' }),
      })
      if (r.ok) {
        const flow = await r.json()
        router.push(`/flows/${flow.id}`)
      }
    } catch { }
  }

  async function deleteFlow(id) {
    if (!confirm('Eliminar este flujo?')) return
    await fetch(`/api/flows/${id}`, { method: 'DELETE' })
    loadFlows()
  }

  return (
    <>
      <Head><title>Flows - Plugin Sandbox</title></Head>
      <div style={{ minHeight:'100vh', background:'#0f172a' }}>
        <div style={styles.header}>
          <div style={{ display:'flex',alignItems:'center',gap:16 }}>
            <button onClick={() => router.push('/dashboard')} style={styles.btnOutline}>
              <ArrowLeft size={14} /> Dashboard
            </button>
            <h1 style={{ fontSize:18, fontWeight:700, color:'#e2e8f0' }}>Flows</h1>
            <span style={{ fontSize:11, color:'#64748b', background:'#1e293b', padding:'2px 8px', borderRadius:99 }}>
              {flows.length}
            </span>
          </div>
          <button onClick={createFlow} style={styles.btnPrimary}>
            <Plus size={14} /> Nuevo flujo
          </button>
        </div>

        {loading ? (
          <div style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:80,color:'#64748b' }}>
            Cargando...
          </div>
        ) : flows.length === 0 ? (
          <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:80 }}>
            <PenTool size={48} style={{ color:'#334155',marginBottom:16 }} />
            <h2 style={{ fontSize:16, fontWeight:600, color:'#94a3b8', marginBottom:8 }}>No hay flujos</h2>
            <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>Crea tu primer diagrama de flujo</p>
            <button onClick={createFlow} style={styles.btnPrimary}>
              <Plus size={14} /> Crear flujo
            </button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16, padding:24, maxWidth:1000, margin:'0 auto' }}>
            {flows.map(f => (
              <div key={f.id} style={styles.card} onClick={() => router.push(`/flows/${f.id}`)}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'#e2e8f0', marginBottom:4 }}>{f.title || 'Sin titulo'}</div>
                    <div style={{ fontSize:11, color:'#64748b' }}>
                      {(f.nodes || []).length} nodos · {(f.edges || []).length} conexiones
                    </div>
                    {f.description && <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>{f.description}</div>}
                    {f.updated_at && <div style={{ fontSize:10, color:'#475569', marginTop:6 }}>{new Date(f.updated_at).toLocaleDateString('es-MX')}</div>}
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteFlow(f.id) }} style={styles.btnDanger}>
                    <Trash2 size={13} />
                  </button>
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
  header: { background:'#0f172a', borderBottom:'1px solid #1e293b', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  btnOutline: { display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:500, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer' },
  btnPrimary: { display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600, border:'none', background:'#3b82f6', color:'#fff', cursor:'pointer' },
  btnDanger: { padding:'4px', borderRadius:6, border:'1px solid transparent', background:'transparent', color:'#475569', cursor:'pointer' },
  card: { background:'#1e293b', borderRadius:12, border:'1px solid #334155', padding:20, cursor:'pointer', transition:'border-color .15s' },
}
