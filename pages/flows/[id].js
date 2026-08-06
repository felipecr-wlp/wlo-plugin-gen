import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import {
  ReactFlow, Controls, Background, MiniMap, useNodesState, useEdgesState,
  addEdge, BackgroundVariant, Handle, Position, MarkerType, useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  ArrowLeft, Save, Trash2, Type, Code, Link as LinkIcon, FileText, Pencil,
  Square, Circle, Minus, Grid3X3, ChevronDown, ChevronUp, Copy, Undo2, Redo2,
  Lock, Unlock, ArrowUp, ArrowDown, Maximize, Download, Upload, Eye, Edit3,
  X, HelpCircle, Share2, Settings, Hand,
} from 'lucide-react'

const CONTENT_TYPES = ['text', 'html', 'url', 'document']
const SHAPES = ['rect', 'circle', 'line', 'grid', 'text']
const shapeNames = { rect: 'Rect', circle: 'Circ', line: 'Linea', grid: 'Grid', text: 'Texto' }
const nodeIcons = { text: <Type size={14} />, html: <Code size={14} />, url: <LinkIcon size={14} />, document: <FileText size={14} /> }
const shapeIcons = { rect: <Square size={14} />, circle: <Circle size={14} />, line: <Minus size={14} />, grid: <Grid3X3 size={14} />, text: <Type size={14} /> }

function CustomNode({ data, selected, id }) {
  const ct = data?.content?.contentType || 'text'
  const locked = data?.locked
  return (
    <div className={`bg-white border-2 rounded-lg px-4 py-3 shadow-sm min-w-[180px] transition-all ${selected ? 'border-blue-500 ring-2 ring-blue-300' : locked ? 'border-gray-200 opacity-70' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <div className="flex items-center gap-2">
        <span className="text-blue-500">{nodeIcons[ct]}</span>
        <span className="text-xs font-semibold truncate flex-1">{data?.label || 'Nodo'}</span>
        {locked && <Lock size={12} className="text-amber-500" />}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  )
}

function ShapeNode({ data, selected }) {
  const s = data?.shape || 'rect'
  const w = data?.width || 160; const h = data?.height || 120
  const fill = data?.fill || '#f1f5f9'; const stroke = data?.stroke || '#64748b'
  const label = data?.label || ''; const rows = data?.rows || 3; const cols = data?.cols || 3
  const locked = data?.locked
  const sel = selected ? { outline: '2px solid #3b82f6', outlineOffset: '2px' } : {}
  const op = locked ? { opacity: 0.6 } : {}
  const L = label ? <text x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="central" fill="#334155" fontSize={13} fontWeight={500} fontFamily="system-ui, sans-serif" style={{ pointerEvents: 'none' }}>{label}</text> : null

  return <div style={{ width: w, height: h, ...sel, ...op, position: 'relative' }}>
    {s === 'circle' && <svg width={w} height={h}><ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 2} ry={h / 2 - 2} fill={fill} stroke={stroke} strokeWidth={2} />{L}</svg>}
    {s === 'line' && <svg width={w} height={h}><line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke={stroke} strokeWidth={3} /><polygon points={`${w - 8},${h / 2 - 5} ${w},${h / 2} ${w - 8},${h / 2 + 5}`} fill={stroke} />{L}</svg>}
    {s === 'grid' && (() => { const cw = w / cols, rh = h / rows; const ls = []; for (let i = 1; i < cols; i++) ls.push(<line key={`v${i}`} x1={i * cw} y1={0} x2={i * cw} y2={h} stroke={stroke} strokeWidth={1} strokeDasharray="4 2" />); for (let i = 1; i < rows; i++) ls.push(<line key={`h${i}`} x1={0} y1={i * rh} x2={w} y2={i * rh} stroke={stroke} strokeWidth={1} strokeDasharray="4 2" />); return <svg width={w} height={h}><rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={2} rx={2} />{ls}{L}</svg> })()}
    {s === 'text' && <svg width={w} height={h}><text x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="central" fill={stroke} fontSize={14} fontWeight={500} fontFamily="system-ui, sans-serif" style={{ pointerEvents: 'none' }}>{label || 'Texto'}</text></svg>}
    {!['circle', 'line', 'grid', 'text'].includes(s) && <svg width={w} height={h}><rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={2} rx={6} />{L}</svg>}
  </div>
}

export default function FlowEditorPage() {
  const router = useRouter()
  const { id } = router.query
  const wsId = router.query.workspace_id || 'demo'
  const instId = router.query.install_id || ''
  const enmarcado = typeof window !== 'undefined' && window.top !== window
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loaded, setLoaded] = useState(false)

  // UI state
  const [topBarCollapsed, setTopBarCollapsed] = useState(false)
  const [toolCollapsed, setToolCollapsed] = useState(false)
  const [altHeld, setAltHeld] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showShare, setShowShare] = useState(false)

  // Editing state
  const [editingNodeId, setEditingNodeId] = useState(null)
  const [nodeLabel, setNodeLabel] = useState('')
  const [nodeContent, setNodeContent] = useState('')
  const [nodeType, setNodeType] = useState('text')
  const [nodeFields, setNodeFields] = useState([])
  const [previewHtml, setPreviewHtml] = useState(false)

  const [editingShapeId, setEditingShapeId] = useState(null)
  const [shapeW, setShapeW] = useState(160); const [shapeH, setShapeH] = useState(120)
  const [shapeLabel, setShapeLabel] = useState('')
  const [shapeFill, setShapeFill] = useState('#f1f5f9'); const [shapeStroke, setShapeStroke] = useState('#64748b')
  const [shapeRows, setShapeRows] = useState(3); const [shapeCols, setShapeCols] = useState(3)
  const [shapeType, setShapeType] = useState('rect')

  const [editingEdgeId, setEditingEdgeId] = useState(null)
  const [edgeLabel, setEdgeLabel] = useState('')
  const [edgeColor, setEdgeColor] = useState('#64748b'); const [edgeWidth, setEdgeWidth] = useState(2)
  const [edgeAnim, setEdgeAnim] = useState(false); const [edgeType, setEdgeType] = useState('default')

  // Context menu
  const [ctxMenu, setCtxMenu] = useState(null)
  const [ctxEdgeMenu, setCtxEdgeMenu] = useState(null)

  const reactFlowInstance = useRef(null)
  const history = useRef([])
  const historyIdx = useRef(-1)
  const clipboard = useRef([])
  const saveTimer = useRef(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/flows/${id}?workspace_id=${encodeURIComponent(wsId)}`).then(r => r.json()).then(f => {
      if (f.id) {
        setTitle(f.title || '')
        setDescription(f.description || '')
        setNodes(f.nodes || [])
        setEdges(f.edges || [])
      }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [id, wsId])

  useEffect(() => {
    if (!enmarcado) return
    const notify = () => window.parent.postMessage({ type: 'wlo-resize', height: document.body.scrollHeight + 40 }, '*')
    notify()
    const ro = new ResizeObserver(notify)
    ro.observe(document.body)
    return () => ro.disconnect()
  }, [loaded])

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
      await fetch(`/api/flows/${id}?workspace_id=${encodeURIComponent(wsId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, nodes: n || nodes, edges: e || edges }),
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
    pushHistory(nodes, edges)
    setEdges(eds => addEdge({ ...conn, style: { stroke: '#64748b', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' } }, eds))
  }, [nodes, edges, setEdges])

  function deleteSelected() {
    const sel = nodes.filter(n => n.selected)
    if (!sel.length) return
    pushHistory(nodes, edges)
    const rest = nodes.filter(n => !n.selected)
    const ids = new Set(sel.map(n => n.id))
    setTimeout(() => {
      setNodes(rest)
      setEdges(eds => eds.filter(e => !ids.has(e.source) && !ids.has(e.target)))
    }, 0)
  }

  const onKeyDown = useCallback((e) => {
    if (e.altKey && e.key === 'm') { setAltHeld(h => !h); e.preventDefault(); return }
    if (e.ctrlKey && e.shiftKey && e.key === 'D') { setSelectMode(s => !s); e.preventDefault(); return }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
    if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected()
    else if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo() }
    else if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo() }
    else if (e.ctrlKey && e.key === 'c') { e.preventDefault(); copySelected() }
    else if (e.ctrlKey && e.key === 'v') { e.preventDefault(); pasteSelected() }
    else if (e.ctrlKey && e.key === 'x') { e.preventDefault(); copySelected(); deleteSelected() }
  }, [nodes, edges])

  const onDragOver = useCallback(e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }, [])
  const onDrop = useCallback(e => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/reactflow')
    if (!type) return
    const bounds = reactFlowInstance.current?.screenToFlowPosition?.({ x: e.clientX, y: e.clientY }) || { x: e.clientX - 250, y: e.clientY - 100 }
    pushHistory(nodes, edges)
    if (type.startsWith('shape:')) {
      const shape = type.split(':')[1]
      const dims = shape === 'line' ? { w: 200, h: 40 } : shape === 'grid' ? { w: 240, h: 200 } : shape === 'text' ? { w: 160, h: 50 } : { w: 160, h: 120 }
      setNodes(nds => [...nds, { id: `shape-${Date.now()}`, type: 'shape', position: bounds, data: { shape, width: dims.w, height: dims.h, fill: '#f1f5f9', stroke: '#64748b', label: shape === 'text' ? 'Texto' : '', cols: 3, rows: 3 } }])
    } else {
      setNodes(nds => [...nds, { id: `node-${Date.now()}`, type: 'custom', position: bounds, data: { label: 'Nuevo nodo', content: { contentType: type, content: '' } } }])
    }
  }, [nodes, edges])

  function handleNodeDoubleClick(e, node) {
    const d = node.data || {}
    if (d.shape) {
      setEditingShapeId(node.id); setShapeW(d.width || 160); setShapeH(d.height || 120)
      setShapeLabel(d.label || ''); setShapeFill(d.fill || '#f1f5f9'); setShapeStroke(d.stroke || '#64748b')
      setShapeRows(d.rows || 3); setShapeCols(d.cols || 3); setShapeType(d.shape)
    } else {
      setEditingNodeId(node.id); setNodeLabel(d.label || ''); setNodeType(d.content?.contentType || 'text')
      setNodeContent(d.content?.content || ''); setNodeFields(d.content?.fields || []); setPreviewHtml(false)
    }
  }

  function saveNode() {
    if (!editingNodeId) return
    setNodes(nds => nds.map(n => n.id === editingNodeId ? { ...n, data: { ...n.data, label: nodeLabel, content: { contentType: nodeType, content: nodeContent, fields: nodeFields } } } : n))
    setEditingNodeId(null); autoSave()
  }

  function saveShape() {
    if (!editingShapeId) return
    setNodes(nds => nds.map(n => n.id === editingShapeId ? { ...n, data: { ...n.data, shape: shapeType, width: shapeW, height: shapeH, label: shapeLabel, fill: shapeFill, stroke: shapeStroke, rows: shapeRows, cols: shapeCols } } : n))
    setEditingShapeId(null); autoSave()
  }

  function saveEdge() {
    if (!editingEdgeId) return
    setEdges(eds => eds.map(e => e.id === editingEdgeId ? {
      ...e, label: edgeLabel || undefined,
      style: { ...e.style, stroke: edgeColor, strokeWidth: edgeWidth },
      animated: edgeAnim, type: edgeType === 'default' ? undefined : edgeType,
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor }
    } : e))
    setEditingEdgeId(null); autoSave()
  }

  function toggleLock(nodeId) {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, locked: !n.data?.locked } } : n))
    autoSave(); setCtxMenu(null)
  }

  function bringToFront(nodeId) {
    setNodes(nds => { const idx = nds.findIndex(n => n.id === nodeId); if (idx < 0) return nds; const u = [...nds]; u.push(u.splice(idx, 1)[0]); return u })
    setCtxMenu(null)
  }

  function sendToBack(nodeId) {
    setNodes(nds => { const idx = nds.findIndex(n => n.id === nodeId); if (idx < 0) return nds; const u = [...nds]; u.unshift(u.splice(idx, 1)[0]); return u })
    setCtxMenu(null)
  }

  function duplicateNode(nodeId) {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    setNodes(nds => [...nds, { ...node, id: `node-${Date.now()}`, position: { x: node.position.x + 40, y: node.position.y + 40 }, selected: false, data: { ...node.data } }])
    setCtxMenu(null)
  }

  function handleNodeContextMenu(e, node) { e.preventDefault(); setCtxEdgeMenu(null); setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: node.id }) }
  function handleEdgeContextMenu(e, edge) { e.preventDefault(); setCtxMenu(null); setCtxEdgeMenu({ x: e.clientX, y: e.clientY, edgeId: edge.id }) }

  function handleEdgeClick() {
    const edge = edges.find(e => e.id === ctxEdgeMenu?.edgeId)
    if (edge) { setEditingEdgeId(edge.id); setEdgeLabel(edge.label || ''); setEdgeColor(edge.style?.stroke || '#64748b'); setEdgeWidth(edge.style?.strokeWidth || 2); setEdgeAnim(edge.animated || false); setEdgeType(edge.type || 'default'); setCtxEdgeMenu(null) }
  }

  const handleExport = useCallback(() => {
    const data = { title, description, nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `${title || 'flujo'}.wlo.json`; a.click(); URL.revokeObjectURL(url)
  }, [title, description, nodes, edges])

  const handleImport = useCallback(() => {
    const el = document.createElement('input'); el.type = 'file'; el.accept = '.json'
    el.onchange = async (ev) => {
      const file = ev.target.files?.[0]; if (!file) return
      try {
        const text = await file.text(); const data = JSON.parse(text)
        if (data.nodes) { setNodes(data.nodes); setEdges(data.edges || []); if (data.title) setTitle(data.title); if (data.description !== undefined) setDescription(data.description); autoSave(data.nodes, data.edges || []) }
      } catch { }
    }; el.click()
  }, [setNodes, setEdges, setTitle, setDescription])

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  }, [])

  if (!loaded) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', color: '#94a3b8' }}>Cargando flujo...</div>

  const selCount = nodes.filter(n => n.selected).length

  return (
    <>
      <Head><title>{title || 'Flujo'} - Plugin Sandbox</title></Head>
      <div className="flex flex-col h-screen" tabIndex={0} onKeyDown={onKeyDown} onClick={() => { setCtxMenu(null); setCtxEdgeMenu(null) }}>
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-2 border-b bg-white shrink-0">
          <button onClick={() => router.push('/flows')} className="text-gray-500 hover:text-gray-700"><ArrowLeft size={18} /></button>
          <input value={title} onChange={e => { setTitle(e.target.value); autoSave() }} className="h-8 max-w-xs font-semibold border-0 bg-transparent outline-none text-lg" placeholder="Titulo del flujo" />
          <div className="flex-1" />
          <span className="text-xs text-gray-400">{saving ? 'Guardando...' : 'Auto-guardado'}</span>
          <button onClick={() => save()} disabled={saving} className="inline-flex items-center gap-1 rounded-md border bg-white hover:bg-gray-50 h-8 px-3 py-1 text-sm"><Save size={14} />Guardar</button>
          <button onClick={handleExport} className="inline-flex items-center gap-1 rounded-md border bg-white hover:bg-gray-50 h-8 px-3 py-1 text-sm" title="Exportar"><Download size={14} />Exportar</button>
          <button onClick={handleImport} className="inline-flex items-center gap-1 rounded-md border bg-white hover:bg-gray-50 h-8 px-3 py-1 text-sm" title="Importar"><Upload size={14} />Importar</button>
          <button onClick={() => setShowShare(true)} className="inline-flex items-center gap-1 rounded-md border bg-white hover:bg-gray-50 h-8 px-3 py-1 text-sm" title="Compartir"><Share2 size={14} />Compartir</button>
        </header>

        {wsId !== 'demo' && (
          <div className="flex items-center gap-4 px-4 py-1.5 bg-gray-50 border-b text-[11px] text-gray-400">
            <span>Workspace: <code className="text-blue-500 font-mono">{wsId}</code></span>
            {instId && <span>Install: <code className="text-blue-500 font-mono">{instId.slice(0, 8)}...</code></span>}
            <span className={enmarcado ? 'text-emerald-600' : 'text-gray-400'}>{enmarcado ? 'WLO' : 'standalone'}</span>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-2 py-1 border-b bg-gray-50 shrink-0">
          <button onClick={() => setTopBarCollapsed(!topBarCollapsed)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><ChevronDown size={14} className={`transition-transform ${topBarCollapsed ? '-rotate-90' : ''}`} /></button>
          {!topBarCollapsed && <>
            <button onClick={undo} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="Deshacer (Ctrl+Z)"><Undo2 size={14} /></button>
            <button onClick={redo} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="Rehacer (Ctrl+Y)"><Redo2 size={14} /></button>
            <div className="w-px h-5 bg-gray-200 mx-0.5" />
            <button onClick={copySelected} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="Copiar (Ctrl+C)"><Copy size={14} /></button>
            <button onClick={pasteSelected} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="Pegar (Ctrl+V)"><FileText size={14} /></button>
            <div className="w-px h-5 bg-gray-200 mx-0.5" />
            <button onClick={() => { const sel = nodes.filter(n => n.selected); sel.forEach(n => duplicateNode(n.id)) }} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="Duplicar"><Copy size={14} /></button>
            <button onClick={deleteSelected} className="p-1.5 hover:bg-gray-200 rounded text-red-500" title="Eliminar (Delete)"><Trash2 size={14} /></button>
            <div className="w-px h-5 bg-gray-200 mx-0.5" />
            <button onClick={() => { nodes.filter(n => n.selected).forEach(n => toggleLock(n.id)) }} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="Bloquear/Desbloquear"><Lock size={14} /></button>
            <button onClick={() => { nodes.filter(n => n.selected).forEach(n => bringToFront(n.id)) }} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="Traer al frente"><ArrowUp size={14} /></button>
            <button onClick={() => { nodes.filter(n => n.selected).forEach(n => sendToBack(n.id)) }} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="Enviar al fondo"><ArrowDown size={14} /></button>
            <div className="flex-1" />
            <button onClick={() => setAltHeld(!altHeld)} className={`p-1.5 rounded ${altHeld ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`} title="Mover area (Alt+M)"><Hand size={14} /></button>
            <button onClick={toggleFullscreen} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="Pantalla completa"><Maximize size={14} /></button>
            <button onClick={() => setShowHelp(true)} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="Ayuda"><HelpCircle size={14} /></button>
          </>}
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onNodesDelete={(del) => { const ids = new Set(del.map(n => n.id)); setEdges(eds => eds.filter(e => !ids.has(e.source) && !ids.has(e.target))) }}
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodeContextMenu={handleNodeContextMenu} onEdgeContextMenu={handleEdgeContextMenu}
            onPaneClick={() => { setCtxMenu(null); setCtxEdgeMenu(null) }}
            onDragOver={onDragOver} onDrop={onDrop}
            onInit={(rf) => { reactFlowInstance.current = rf }}
            nodeTypes={{ custom: CustomNode, shape: ShapeNode }}
            selectNodesOnDrag={selectMode} minZoom={0.1} maxZoom={4}
            panOnDrag={altHeld} panActivationKeyCode="Alt" selectionKeyCode="Control" multiSelectionKeyCode="Control"
            deleteKeyCode={null} fitView className="bg-gray-50"
          >
            <Controls /><Background variant={BackgroundVariant.Dots} gap={20} size={1} /><MiniMap nodeColor="#94a3b8" className="!bg-white border" />
            {selCount > 1 && <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none">{selCount} seleccionados</div>}
          </ReactFlow>

          {/* Context Menu */}
          {ctxMenu && <div className="fixed z-50 bg-white border rounded-lg shadow-xl p-1 min-w-[160px]" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={e => e.stopPropagation()}>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 rounded" onClick={() => toggleLock(ctxMenu.nodeId)}>{nodes.find(n => n.id === ctxMenu.nodeId)?.data?.locked ? <><Unlock size={12} />Desbloquear</> : <><Lock size={12} />Bloquear</>}</button>
            <hr className="my-1" />
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 rounded" onClick={() => bringToFront(ctxMenu.nodeId)}><ArrowUp size={12} />Traer al frente</button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 rounded" onClick={() => sendToBack(ctxMenu.nodeId)}><ArrowDown size={12} />Enviar al fondo</button>
            <hr className="my-1" />
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 rounded" onClick={() => duplicateNode(ctxMenu.nodeId)}><Copy size={12} />Duplicar</button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 rounded text-red-600" onClick={() => { setNodes(nds => nds.filter(n => n.id !== ctxMenu.nodeId)); setEdges(eds => eds.filter(e => e.source !== ctxMenu.nodeId && e.target !== ctxMenu.nodeId)); setCtxMenu(null); autoSave() }}><Trash2 size={12} />Eliminar</button>
          </div>}

          {/* Context Edge Menu */}
          {ctxEdgeMenu && <div className="fixed z-50 bg-white border rounded-lg shadow-xl p-1 min-w-[160px]" style={{ left: ctxEdgeMenu.x, top: ctxEdgeMenu.y }} onClick={e => e.stopPropagation()}>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 rounded" onClick={handleEdgeClick}><Settings size={12} />Propiedades</button>
            <hr className="my-1" />
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 rounded text-red-600" onClick={() => { setEdges(eds => eds.filter(e => e.id !== ctxEdgeMenu.edgeId)); setCtxEdgeMenu(null); autoSave() }}><Trash2 size={12} />Eliminar</button>
          </div>}

          {/* Toolbox */}
          <div className="absolute top-3 left-3 bg-white border rounded-lg shadow-lg z-20 transition-all" style={{ width: toolCollapsed ? 40 : 180 }}>
            <div className="flex items-center justify-between px-2 py-1.5 border-b cursor-move select-none" onMouseDown={e => { e.preventDefault(); const sx = e.clientX, sy = e.clientY; const m = ev => { }; window.addEventListener('mousemove', m); window.addEventListener('mouseup', () => { window.removeEventListener('mousemove', m) }, { once: true }) }}>
              <span className="text-[10px] font-medium text-gray-400">{toolCollapsed ? '' : 'Herramientas'}</span>
              <div className="flex items-center gap-0.5">
                <button onClick={toggleFullscreen} className="p-0.5 hover:bg-gray-100 rounded" title="Pantalla completa"><Maximize size={12} /></button>
                <button onClick={() => setToolCollapsed(!toolCollapsed)} className="p-0.5 hover:bg-gray-100 rounded"><ChevronUp size={12} className={`transition-transform ${toolCollapsed ? 'rotate-180' : ''}`} /></button>
              </div>
            </div>
            {!toolCollapsed && <div className="p-2 flex flex-col gap-1">
              <span className="text-[10px] font-medium text-gray-400 px-1">Contenido</span>
              {CONTENT_TYPES.map(t => <button key={t} draggable onDragStart={e => { e.dataTransfer.setData('application/reactflow', t); e.dataTransfer.effectAllowed = 'move' }} className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-gray-100 cursor-grab">{nodeIcons[t]} {t === 'text' ? 'Texto' : t === 'html' ? 'HTML' : t === 'url' ? 'URL' : 'Documento'}</button>)}
              <hr className="my-0.5" />
              <span className="text-[10px] font-medium text-gray-400 px-1">Dibujo</span>
              {SHAPES.map(s => <button key={s} draggable onDragStart={e => { e.dataTransfer.setData('application/reactflow', `shape:${s}`); e.dataTransfer.effectAllowed = 'move' }} className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-gray-100 cursor-grab">{shapeIcons[s]} {shapeNames[s]}</button>)}
              <hr className="my-0.5" />
              <button className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-gray-100" onClick={() => setShowHelp(true)}><HelpCircle size={12} />Ayuda</button>
              <button className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-gray-100 text-red-500" onClick={deleteSelected}><Trash2 size={12} />Eliminar</button>
            </div>}
          </div>
        </div>

        {/* Description footer */}
        <footer className="px-4 py-2 border-t bg-white shrink-0">
          <input value={description} onChange={e => { setDescription(e.target.value); autoSave() }} className="h-8 w-full border-0 bg-transparent outline-none text-xs text-gray-400" placeholder="Descripcion (opcional)" />
        </footer>

        {/* Node Edit Modal */}
        {editingNodeId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingNodeId(null)}>
          <div className="bg-white border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b"><span className="font-semibold text-sm">Editar nodo</span><button onClick={() => setEditingNodeId(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button></div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Nombre</label>
                <input value={nodeLabel} onChange={e => setNodeLabel(e.target.value)} className="w-full h-9 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Campos personalizados</label>
                <div className="space-y-2">
                  {nodeFields.map((f, i) => <div key={i} className="flex gap-2"><input value={f.key} onChange={e => { const nf = [...nodeFields]; nf[i] = { ...nf[i], key: e.target.value }; setNodeFields(nf) }} className="flex-1 h-8 rounded-md border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-200" placeholder="Nombre" /><input value={f.value} onChange={e => { const nf = [...nodeFields]; nf[i] = { ...nf[i], value: e.target.value }; setNodeFields(nf) }} className="flex-[2] h-8 rounded-md border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-200" placeholder="Valor" /><button onClick={() => setNodeFields(nodeFields.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 p-1"><X size={12} /></button></div>)}
                  <button onClick={() => setNodeFields([...nodeFields, { key: '', value: '' }])} className="text-xs text-blue-600 hover:underline">+ Agregar campo</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo</label>
                <div className="flex gap-1">
                  {CONTENT_TYPES.map(t => <button key={t} onClick={() => { setNodeType(t); setPreviewHtml(false) }} className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${nodeType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{nodeIcons[t]} {t === 'text' ? 'Texto' : t === 'html' ? 'HTML' : t === 'url' ? 'URL' : 'Doc'}</button>)}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-500">{nodeType === 'url' ? 'URL' : 'Contenido'}</label>
                  {nodeType === 'html' && <button onClick={() => setPreviewHtml(!previewHtml)} className={`flex items-center gap-1 text-xs rounded px-2 py-0.5 ${previewHtml ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{previewHtml ? <Edit3 size={12} /> : <Eye size={12} />}{previewHtml ? 'Codigo' : 'Preview'}</button>}
                </div>
                {nodeType === 'html' && previewHtml
                  ? <iframe key="preview" srcDoc={nodeContent} className="w-full min-h-[200px] rounded-md border bg-white" sandbox="allow-scripts" style={{ border: 0 }} />
                  : <textarea value={nodeContent} onChange={e => setNodeContent(e.target.value)} className="w-full min-h-[200px] rounded-md border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-200 resize-y" placeholder={nodeType === 'url' ? 'https://ejemplo.com' : nodeType === 'html' ? '<div><h1>Hola</h1></div>' : 'Contenido...'} />
                }
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
              <button onClick={() => setEditingNodeId(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={saveNode} className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save size={14} />Guardar</button>
            </div>
          </div>
        </div>}

        {/* Shape Edit Modal */}
        {editingShapeId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingShapeId(null)}>
          <div className="bg-white border rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b"><span className="font-semibold text-sm">Propiedades</span><button onClick={() => setEditingShapeId(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button></div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-gray-500 mb-1 block">Ancho</label><input type="number" value={shapeW} onChange={e => setShapeW(Number(e.target.value))} className="w-full h-9 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" min={20} max={1200} /></div>
                <div><label className="text-xs font-medium text-gray-500 mb-1 block">Alto</label><input type="number" value={shapeH} onChange={e => setShapeH(Number(e.target.value))} className="w-full h-9 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" min={20} max={1200} /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Etiqueta</label><input value={shapeLabel} onChange={e => setShapeLabel(e.target.value)} className="w-full h-9 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" placeholder="Texto de la etiqueta" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Relleno</label>
                  <div className="flex gap-2"><input type="color" value={shapeFill} onChange={e => setShapeFill(e.target.value)} className="w-9 h-9 rounded border cursor-pointer" /><input value={shapeFill} onChange={e => setShapeFill(e.target.value)} className="flex-1 h-9 rounded-md border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-200" /></div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Borde</label>
                  <div className="flex gap-2"><input type="color" value={shapeStroke} onChange={e => setShapeStroke(e.target.value)} className="w-9 h-9 rounded border cursor-pointer" /><input value={shapeStroke} onChange={e => setShapeStroke(e.target.value)} className="flex-1 h-9 rounded-md border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-200" /></div>
                </div>
              </div>
              {shapeType === 'grid' && <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-gray-500 mb-1 block">Columnas</label><input type="number" value={shapeCols} onChange={e => setShapeCols(Number(e.target.value))} className="w-full h-9 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" min={1} max={20} /></div>
                <div><label className="text-xs font-medium text-gray-500 mb-1 block">Filas</label><input type="number" value={shapeRows} onChange={e => setShapeRows(Number(e.target.value))} className="w-full h-9 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" min={1} max={20} /></div>
              </div>}
              <div className="flex gap-1">{SHAPES.map(t => <button key={t} onClick={() => setShapeType(t)} className={`flex-1 flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium ${shapeType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{shapeIcons[t]}{shapeNames[t]}</button>)}</div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
              <button onClick={() => setEditingShapeId(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={saveShape} className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save size={14} />Guardar</button>
            </div>
          </div>
        </div>}

        {/* Edge Edit Modal */}
        {editingEdgeId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingEdgeId(null)}>
          <div className="bg-white border rounded-xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b"><span className="font-semibold text-sm">Propiedades de linea</span><button onClick={() => setEditingEdgeId(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button></div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Etiqueta</label><input value={edgeLabel} onChange={e => setEdgeLabel(e.target.value)} className="w-full h-9 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" placeholder="Texto sobre la linea" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Color</label>
                  <div className="flex gap-2"><input type="color" value={edgeColor} onChange={e => setEdgeColor(e.target.value)} className="w-9 h-9 rounded border cursor-pointer" /><input value={edgeColor} onChange={e => setEdgeColor(e.target.value)} className="flex-1 h-9 rounded-md border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-200" /></div>
                </div>
                <div><label className="text-xs font-medium text-gray-500 mb-1 block">Grosor</label><input type="number" value={edgeWidth} onChange={e => setEdgeWidth(Number(e.target.value))} className="w-full h-9 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" min={1} max={10} /></div>
              </div>
              <div className="flex gap-1">
                {['default', 'straight', 'step', 'smoothstep'].map(t => <button key={t} onClick={() => setEdgeType(t)} className={`flex-1 flex items-center justify-center rounded-md px-2 py-1.5 text-[10px] font-medium ${edgeType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{t === 'default' ? 'Curva' : t === 'straight' ? 'Recta' : t === 'step' ? 'Escalon' : 'Suave'}</button>)}
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={edgeAnim} onChange={e => setEdgeAnim(e.target.checked)} className="rounded" />Animada</label>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
              <button onClick={() => setEditingEdgeId(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={saveEdge} className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save size={14} />Guardar</button>
            </div>
          </div>
        </div>}

        {/* Help Modal */}
        {showHelp && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-white border rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b"><span className="font-semibold text-sm">Ayuda de Flows</span><button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button></div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
              <div><h4 className="font-medium text-xs text-blue-600 mb-2">Movimiento</h4>
                <div className="space-y-1.5 text-xs text-gray-500">
                  <div><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2">Click + Arrastrar</kbd>Mover elementos</div>
                  <div><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2">Alt+M (toggle)</kbd>Mover area de trabajo</div>
                  <div><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2">Rueda del mouse</kbd>Zoom in/out</div>
                </div>
              </div>
              <div><h4 className="font-medium text-xs text-blue-600 mb-2">Seleccion</h4>
                <div className="space-y-1.5 text-xs text-gray-500">
                  <div><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2">Click</kbd>Seleccionar elemento</div>
                  <div><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2">Ctrl+Shift+D</kbd>Seleccion multiple</div>
                </div>
              </div>
              <div><h4 className="font-medium text-xs text-blue-600 mb-2">Teclado</h4>
                <div className="space-y-1.5 text-xs text-gray-500">
                  <div><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2">Delete</kbd>Eliminar seleccion</div>
                  <div><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2">Ctrl + Z</kbd>Deshacer</div>
                  <div><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2">Ctrl + Y</kbd>Rehacer</div>
                  <div><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2">Ctrl + C</kbd>Copiar</div>
                  <div><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2">Ctrl + V</kbd>Pegar</div>
                </div>
              </div>
              <div><h4 className="font-medium text-xs text-blue-600 mb-2">Interaccion</h4>
                <div className="space-y-1.5 text-xs text-gray-500">
                  <div><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2">Doble click</kbd>Editar propiedades</div>
                  <div><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2">Click derecho</kbd>Menu contextual</div>
                  <div><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2">Arrastrar toolbar</kbd>Crear elemento</div>
                </div>
              </div>
            </div>
          </div>
        </div>}

        {/* Share Modal */}
        {showShare && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowShare(false)}>
          <div className="bg-white border rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><span className="font-semibold text-sm">Compartir</span><button onClick={() => setShowShare(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button></div>
            <p className="text-xs text-gray-500 mb-3">Copia el enlace para compartir este flujo. Quien lo abra necesitara acceso al sandbox.</p>
            <div className="flex gap-2">
              <code className="flex-1 text-xs bg-gray-100 rounded px-3 py-2 break-all font-mono">{typeof window !== 'undefined' ? `${window.location.origin}/flows/${id}` : ''}</code>
              <button onClick={() => { navigator.clipboard.writeText(typeof window !== 'undefined' ? `${window.location.origin}/flows/${id}` : '') }} className="shrink-0 px-3 py-2 text-xs border rounded-lg hover:bg-gray-50">Copiar</button>
            </div>
          </div>
        </div>}
      </div>
    </>
  )
}
