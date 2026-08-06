/**
 * Funcion sin servidor: el unico lugar donde vive el token.
 *
 * Proxy seguro para que las herramientas alojadas en este sandbox puedan
 * hablar con WLO sin exponer el token al navegador.
 *
 * Contrato del lado de WLO:
 *   POST https://wlo.vercel.app/api/connectors/call/<accion>
 *   Authorization: Bearer pck_live_...
 *   x-pavific-app: <nombre de tu herramienta>
 *   Content-Type: application/json
 */

const WLO = process.env.WLO_BASE_URL || 'https://wlo.vercel.app'

export default async function handler(req, res) {
  // CORS para iframes con origen opaco (sandbox sin allow-same-origin)
  const origin = req.headers.origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = process.env.WLO_CONNECTOR_TOKEN
  if (!token) {
    return res.status(500).json({
      ok: false,
      error: 'Falta WLO_CONNECTOR_TOKEN. Agregala en Vercel > Settings > Environment Variables y vuelve a desplegar.',
    })
  }

  const { action, body } = req.body || {}
  const workspaceId = (req.query && req.query.workspace_id) || ''

  try {
    const r = await fetch(`${WLO}/api/connectors/call/${action || 'ping'}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-pavific-app': 'wlo-plugin-gen',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body || { echo: workspaceId || 'sin workspace' }),
    })

    const data = await r.json()
    res.status(r.status).json(data)
  } catch (e) {
    res.status(502).json({ ok: false, error: `No se pudo hablar con WLO: ${e.message}` })
  }
}
