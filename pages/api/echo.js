/**
 * Endpoint de pruebas para el conector REST de wlo-flow.
 *
 * Recibe cualquier payload sin validacion y lo devuelve tal cual, junto con
 * metadatos utiles para verificar como llega la peticion (metodo, headers,
 * body). Sirve para probar el nodo "Enviar a API REST" sin depender de un
 * servicio externo.
 *
 * Uso en wlo-flow: URL = https://wlo-plugin-gen.vercel.app/api/echo
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') return res.status(200).end()

  let body = null
  try { body = req.body } catch { body = null }

  // Reflejar el body recibido. Si no hay body, devolver un objeto vacio.
  const respuesta = {
    ok: true,
    metodo: req.method,
    url: req.url,
    headers: req.headers,
    body: body !== undefined && body !== null ? body : null,
    recibido_en: new Date().toISOString(),
  }

  return res.status(200).json(respuesta)
}
