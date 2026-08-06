import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import {
  ReactFlow, Controls, Background, MiniMap, useNodesState, useEdgesState,
  addEdge, BackgroundVariant, Handle, Position, MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  ArrowLeft, Save, Trash2, Type, Code, Link as LinkIcon, FileText,
  Square, Circle, Minus, Grid3X3, ChevronDown, ChevronUp, Copy, Undo2, Redo2,
} from 'lucide-react'

const icons = { text: <Type size={12} />, html: <Code size={12} />, url: <LinkIcon size={12} />, document: <FileText size={12} /> }
const CONTENT_TYPES = ['text', 'html', 'url', 'document']
const SHAPES = ['rect', 'circle', 'line', 'grid', 'text']

function CustomNode({ data, selected }) {
  const ct = data?.content?.contentType || 'text'
  return (
    <div className={`bg-white border-2 rounded-lg px-4 py-3 shadow-sm min-w-[200px] ${selected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <span className="text-blue-500">{icons[ct]}</span>
        <span className="text-xs font-semibold truncate flex-1">{data?.label || 'Nodo'}</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

function ShapeNode({ data, selected }) {
  const s = data?.shape || 'rect'
  const w = data?.width || 160
  const h = data?.height || 120
  const fill = data?.fill || '#f1f5f9'
  const stroke = data?.stroke || '#64748b'
  const label = data?.label || ''
  const cols = data?.cols || 3
  const rows = data?.rows || 3
  const sel = selected ? { outline: '2px solid #3b82f6', outlineOffset: '2px' } : {}

  const Label = label ? <text x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="central" fill="#334155" fontSize={13} fontWeight={500} fontFamily="system-ui, sans-serif" style={{ pointerEvents: 'none' }}>{label}</text> : null

  return (
    <div style={{ width: w, height: h, ...sel, position: 'relative' }}>
      {s === 'circle' && <svg width={w} height={h}><ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 2} ry={h / 2 - 2} fill={fill} stroke={stroke} strokeWidth={2} />{Label}</svg>}
      {s === 'line' && <svg width={w} height={h}><line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke={stroke} strokeWidth={3} /><polygon points={`${w - 8},${h / 2 - 5} ${w},${h / 2} ${w - 8},${h / 2 + 5}`} fill={stroke} />{Label}</svg>}
      {s === 'grid' && (() => { const cw = w / cols, rh = h / rows; const lines = []; for (let i = 1; i < cols; i++) lines.push(<line key={`v${i}`} x1={i * cw} y1={0} x2={i * cw} y2={h} stroke={stroke} strokeWidth={1} strokeDasharray="4 2" />); for (let i = 1; i < rows; i++) lines.push(<line key={`h${i}`} x1={0} y1={i * rh} x2={w} y2={i * rh} stroke={stroke} strokeWidth={1} strokeDasharray="4 2" />); return <svg width={w} height={h}><rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={2} rx={2} />{lines}{Label}</svg> })()}
      {s === 'text' && <svg width={w} height={h}><text x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="central" fill={stroke} fontSize={14} fontWeight={500} fontFamily="system-ui, sans-serif" style={{ pointerEvents: 'none' }}>{label || 'Texto'}</text></svg>}
      {!['circle', 'line', 'grid', 'text'].includes(s) && <svg width={w} height={h}><rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={2} rx={6} />{Label}</svg>}
    </div>
  )
}

export default function FlowEditorPage() {
  const router = useRouter()
  const { id } = router.query
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loaded, setLoaded] = useState(false)
  const [topBarCollapsed, setTopBarCollapsed] = useState(false)
  const history = useRef([])
  const historyIdx = useRef(-1)
  const clipboard = useRef([])
  const saveTimer = useRef(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/flows/${id}`).then(r => r.json()).then(f => {
      if (f.id) {
        setTitle(f.title || '')
        setNodes(f.nodes || [])
        setEdges(f.edges || [])
      }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [id])

  function pushHistory(n, e) {
    const h = history.current
    h.length = historyIdx.current + 1
    h.push({ nodes: JSON.parse(JSON.stringify(n)), edges: JSON.parse(JSON.stringify(e)) })
    if (h.length > 50) h.shift()
    else historyIdx.current++
  }

  async function save(n, e) {
    setSaving(true)
    try {
      await fetch(`/api/flows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, nodes: n || nodes, edges: e || edges })
      })
    } catch { }
    setSaving(false)
  }

  function autoSave(n, e) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(n, e), 800)
  }

  function undo() {
    if (historyIdx.current <= 0) return
    historyIdx.current--
    const s = history.current[historyIdx.current]
    setNodes(s.nodes); setEdges(s.edges)
  }

  function redo() {
    if (historyIdx.current >= history.current.length - 1) return
    historyIdx.current++
    const s = history.current[historyIdx.current]
    setNodes(s.nodes); setEdges(s.edges)
  }

  function copySelected() {
    const sel = nodes.filter(n => n.selected)
    clipboard.current = sel.map(n => ({ ...n, id: `node-${Date.now()}` }))
  }

  function pasteSelected() {
    if (!clipboard.current.length) return
    const pasted = clipboard.current.map(n => ({ ...n, id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, position: { x: n.position.x + 40, y: n.position.y + 40 } }))
    setNodes(nds => [...nds, ...pasted])
  }

  const onConnect = useCallback((conn) => {
    setEdges(eds => addEdge({ ...conn, style: { stroke: '#64748b', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' } }, eds))
  }, [setEdges])

  function addNode(type) {
    const newId = `node-${Date.now()}`
    setNodes(nds => {
      const newNode = { id: newId, type: 'custom', position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 }, data: { label: 'Nuevo nodo', content: { contentType: type, content: '' } } }
      pushHistory(nds, edges)
      return [...nds, newNode]
    })
  }

  function addShape(shape) {
    const newId = `shape-${Date.now()}`
    const dims = shape === 'line' ? { w: 200, h: 40 } : shape === 'grid' ? { w: 240, h: 200 } : shape === 'text' ? { w: 160, h: 50 } : { w: 160, h: 120 }
    setNodes(nds => {
      const newNode = { id: newId, type: 'shape', position: { x: Math.random() * 400 + 50, y: Math.random() * 250 + 50 }, data: { shape, width: dims.w, height: dims.h, fill: '#f1f5f9', stroke: '#64748b', label: shape === 'text' ? 'Texto' : '', cols: 3, rows: 3 } }
      pushHistory(nds, edges)
      return [...nds, newNode]
    })
  }

  function deleteSelected() {
    const sel = nodes.filter(n => n.selected)
    const rest = nodes.filter(n => !n.selected)
    const ids = new Set(sel.map(n => n.id))
    pushHistory(nodes, edges)
    setEdges(eds => eds.filter(e => !ids.has(e.source) && !ids.has(e.target)))
    setNodes(rest)
  }

  const onKeyDown = useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
    if (e.key === 'Delete') deleteSelected()
    else if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo() }
    else if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo() }
    else if (e.ctrlKey && e.key === 'c') { e.preventDefault(); copySelected() }
    else if (e.ctrlKey && e.key === 'v') { e.preventDefault(); pasteSelected() }
  }, [nodes, edges])

  const onDragOver = useCallback(e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }, [])
  const onDrop = useCallback(e => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/reactflow')
    if (!type) return
    const pos = { x: e.clientX - 200, y: e.clientY - 100 }
    if (type.startsWith('shape:')) {
      const shape = type.split(':')[1]
      setNodes(nds => {
        pushHistory(nds, edges)
        return [...nds, { id: `shape-${Date.now()}`, type: 'shape', position: pos, data: { shape, width: shape === 'line' ? 200 : 160, height: shape === 'line' ? 40 : 120, fill: '#f1f5f9', stroke: '#64748b', label: '', cols: 3, rows: 3 } }]
      })
    } else {
      setNodes(nds => {
        pushHistory(nds, edges)
        return [...nds, { id: `node-${Date.now()}`, type: 'custom', position: pos, data: { label: 'Nuevo nodo', content: { contentType: type, content: '' } } }]
      })
    }
  }, [setNodes, edges])

  if (!loaded) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', color: '#94a3b8' }}>Cargando flujo...</div>

  return (
    <>
      <Head><title>{title || 'Flujo'} - Plugin Sandbox</title></Head>
      <div className="flex flex-col h-screen" tabIndex={0} onKeyDown={onKeyDown}>
        <header className="flex items-center gap-3 px-4 py-2 border-b bg-white shrink-0">
          <button onClick={() => router.push('/flows')} className="text-gray-500 hover:text-gray-700"><ArrowLeft size={18} /></button>
          <input value={title} onChange={e => { setTitle(e.target.value); autoSave() }} className="h-8 max-w-xs font-semibold border-0 bg-transparent outline-none text-lg" placeholder="Titulo del flujo" />
          <div className="flex-1" />
          <span className="text-xs text-gray-400">{saving ? 'Guardando...' : 'Auto-guardado'}</span>
          <button onClick={() => save()} disabled={saving} className="inline-flex items-center gap-1 rounded-md border bg-white hover:bg-gray-50 h-8 px-3 py-1 text-sm"><Save size={14} />Guardar</button>
        </header>

        <div className="flex items-center gap-1 px-2 py-1 border-b bg-gray-50 shrink-0">
          <button onClick={() => setTopBarCollapsed(!topBarCollapsed)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><ChevronDown size={14} className={`transition-transform ${topBarCollapsed ? '-rotate-90' : ''}`} /></button>
          {!topBarCollapsed && <>
            <button onClick={undo} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="Deshacer"><Undo2 size={14} /></button>
            <button onClick={redo} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="Rehacer"><Redo2 size={14} /></button>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button onClick={copySelected} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="Copiar"><Copy size={14} /></button>
            <button onClick={pasteSelected} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="Pegar"><Copy size={14} /></button>
            <button onClick={deleteSelected} className="p-1.5 hover:bg-gray-200 rounded text-red-500" title="Eliminar"><Trash2 size={14} /></button>
          </>}
        </div>

        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver} onDrop={onDrop}
            nodeTypes={{ custom: CustomNode, shape: ShapeNode }}
            fitView
            minZoom={0.1} maxZoom={4}
            deleteKeyCode={null}
            className="bg-gray-50"
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <MiniMap nodeColor="#94a3b8" className="!bg-white border" />
          </ReactFlow>

          <div className="absolute top-3 left-3 bg-white border rounded-lg shadow-lg z-20" style={{ width: 180 }}>
            <div className="p-2 flex flex-col gap-1">
              <span className="text-[10px] font-medium text-gray-400 px-1">Contenido</span>
              {CONTENT_TYPES.map(t => (
                <button key={t} draggable onDragStart={e => { e.dataTransfer.setData('application/reactflow', t); e.dataTransfer.effectAllowed = 'move' }} className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-gray-100 cursor-grab">{icons[t]}{t === 'text' ? 'Texto' : t === 'html' ? 'HTML' : t === 'url' ? 'URL' : 'Documento'}</button>
              ))}
              <hr className="my-0.5" />
              <span className="text-[10px] font-medium text-gray-400 px-1">Dibujo</span>
              {SHAPES.map(s => (
                <button key={s} draggable onDragStart={e => { e.dataTransfer.setData('application/reactflow', `shape:${s}`); e.dataTransfer.effectAllowed = 'move' }} className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-gray-100 cursor-grab">{s === 'rect' ? <Square size={12} /> : s === 'circle' ? <Circle size={12} /> : s === 'line' ? <Minus size={12} /> : s === 'grid' ? <Grid3X3 size={12} /> : <Type size={12} />}{s === 'rect' ? 'Rectangulo' : s === 'circle' ? 'Circulo' : s === 'line' ? 'Linea' : s === 'grid' ? 'Cuadricula' : 'Texto'}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
