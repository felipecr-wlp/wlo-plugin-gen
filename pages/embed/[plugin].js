import fs from 'fs'
import path from 'path'

/**
 * Pagina de embed para herramientas alojadas en el sandbox.
 *
 * WLO enmarca esta pagina y pasa workspace_id e install_id como parametros.
 * El HTML de la herramienta se sirve tal cual via getServerSideProps.
 *
 * Contrato:
 *   https://wlo-plugin-gen.vercel.app/embed/wlo-hello-beta?workspace_id=<uuid>&install_id=<uuid>
 */
export async function getServerSideProps({ params, res }) {
  const plugin = params.plugin

  if (!plugin || /[^a-zA-Z0-9_-]/.test(plugin)) {
    return { notFound: true }
  }

  const candidates = [
    path.join(process.cwd(), 'public', 'plugins', plugin, 'index.html'),
    path.join(process.cwd(), 'public', 'plugins', plugin, 'public', 'index.html'),
  ]

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const html = fs.readFileSync(filePath, 'utf-8')
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.write(html)
      res.end()
      return { props: {} }
    }
  }

  return { notFound: true }
}

/**
 * Esto nunca se renderiza: getServerSideProps intercepta y sirve el HTML
 * directo. Existe solo para que Next.js no reclame un default export.
 */
export default function Embed() {
  return null
}
