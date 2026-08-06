import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push('/dashboard')
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { error } = await supabase.auth.signUp({ email: regEmail, password: regPassword })
    if (error) setError(error.message)
    else { setSuccess('Cuenta creada! Ya puedes iniciar sesión.'); setMode('login') }
    setLoading(false)
  }

  return (
    <>
      <Head><title>Plugin Sandbox</title></Head>
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={{fontSize:24,fontWeight:700,marginBottom:4}}>Plugin Sandbox</h1>
          <p style={{fontSize:14,color:'#64748b',marginBottom:24}}>Prueba tus plugins WLO</p>
          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} style={styles.form}>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" style={styles.input} required />
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña" style={styles.input} required />
              <button type="submit" disabled={loading} style={styles.btn}>{loading ? '...' : 'Iniciar sesión'}</button>
              <span onClick={()=>setMode('register')} style={styles.link}>Crear cuenta</span>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={styles.form}>
              <input type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} placeholder="Email" style={styles.input} required />
              <input type="password" value={regPassword} onChange={e=>setRegPassword(e.target.value)} placeholder="Contraseña (min 6)" style={styles.input} required />
              <button type="submit" disabled={loading} style={styles.btn}>{loading ? '...' : 'Registrarse'}</button>
              <span onClick={()=>setMode('login')} style={styles.link}>Ya tengo cuenta</span>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

const styles = {
  container: { minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8fafc' },
  card: { background:'#fff',borderRadius:16,boxShadow:'0 1px 3px rgba(0,0,0,.1)',padding:40,width:'100%',maxWidth:400 },
  form: { display:'flex',flexDirection:'column',gap:12 },
  input: { height:40,border:'1px solid #e2e8f0',borderRadius:8,padding:'0 12px',fontSize:14,outline:'none' },
  btn: { height:40,background:'#3b82f6',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer' },
  link: { fontSize:13,color:'#3b82f6',cursor:'pointer',textAlign:'center',marginTop:8 },
  error: { background:'#fef2f2',color:'#dc2626',padding:'8px 12px',borderRadius:8,fontSize:13,marginBottom:12 },
  success: { background:'#f0fdf4',color:'#16a34a',padding:'8px 12px',borderRadius:8,fontSize:13,marginBottom:12 },
}
