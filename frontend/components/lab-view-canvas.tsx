"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Node, 
  Edge, 
  BackgroundVariant, 
  useNodesState, 
  useEdgesState,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  Connection,
  addEdge
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ExperimentPlan, LabView, LabNode } from "@/lib/types";
import { Button, Badge } from "@/components/ui";
import { Info, Flag, Layout, BookOpen, ExternalLink, Pencil, Plus, RotateCcw, Trash2, AlertTriangle, RefreshCw, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { regenerateFromLabView } from "@/lib/api";

// --- Custom Node Component ---
function LabCustomNode({ data }: { data: any }) {
  const isFlagged = data.state.status === "flagged";
  const isReviewed = data.state.status === "reviewed";
  const isApproved = data.state.status === "approved";
  const isEdited = data.state.version > 1;
  const isWeak = data.metadata.confidence < 0.7;
  const isDemoSource = data.metadata.supporting_sources?.some((u: string) => u.includes("example.org") || u.includes("example.com"));
  const confPct = Math.round(data.metadata.confidence * 100);

  const borderColor =
    isFlagged ? "border-rose-400 shadow-rose-100" :
    isApproved ? "border-emerald-500 shadow-emerald-100" :
    isReviewed ? "border-emerald-400 shadow-emerald-100" :
    data.showDescription ? "border-primary/60 shadow-primary/10 shadow-lg" :
    "border-slate-200 hover:border-primary/40";

  const confColor =
    confPct >= 80 ? "bg-emerald-400" :
    confPct >= 65 ? "bg-amber-400" :
    "bg-rose-400";

  return (
    <div className={`px-4 py-3 shadow-md rounded-xl bg-white border-2 transition-all w-[260px] ${borderColor}`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-400" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Badge className={(
            "font-mono text-[10px] uppercase tracking-wider px-1.5 py-0 border " +
            (data.node_type === "process" ? "bg-blue-50 text-blue-700 border-blue-200" :
            data.node_type === "material" ? "bg-amber-50 text-amber-700 border-amber-200" :
            data.node_type === "assay" ? "bg-purple-50 text-purple-700 border-purple-200" :
            "bg-emerald-50 text-emerald-700 border-emerald-200")
          )}>
            {data.node_type}
          </Badge>
          {isWeak && <div title="Low Confidence"><AlertTriangle className="w-3 h-3 text-amber-500" /></div>}
        </div>
        <div className="flex items-center gap-1.5">
          {isDemoSource && <Badge className="bg-violet-50 text-violet-600 border-violet-200 font-mono text-[8px] px-1 py-0">DEMO</Badge>}
          {isEdited && <Badge className="bg-slate-100 text-slate-500 border-slate-200 font-mono text-[8px] px-1 py-0">EDITED</Badge>}
          {isFlagged && <div title="Needs Review"><Flag className="w-3 h-3 text-rose-500" /></div>}
          {isApproved && <div className="w-2 h-2 rounded-full bg-emerald-500" title="Approved" />}
          {isReviewed && !isApproved && <div className="w-2 h-2 rounded-full bg-emerald-400" title="Reviewed" />}
        </div>
      </div>
      
      <div className="font-bold text-slate-800 text-sm mb-2">{data.label}</div>

      {/* Confidence bar */}
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${confColor}`} style={{ width: `${confPct}%` }} />
        </div>
        <span className={`font-mono text-[9px] font-bold ${confPct >= 80 ? "text-emerald-600" : confPct >= 65 ? "text-amber-600" : "text-rose-500"}`}>
          {confPct}%
        </span>
      </div>

      {data.showDescription && (
        <div className="text-xs text-slate-500 leading-snug mt-2 pt-2 border-t border-slate-100">
          {data.description}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-slate-400" />
    </div>
  );
}

const nodeTypes = {
  labNode: LabCustomNode,
};

type GraphNavigatorFilter = "all" | "process" | "materials" | "assays" | "validation" | "risks" | "evidence";

const graphNavigatorFilters: { id: GraphNavigatorFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "process", label: "Process" },
  { id: "materials", label: "Materials" },
  { id: "assays", label: "Assays" },
  { id: "validation", label: "Validation" },
  { id: "risks", label: "Risks" },
  { id: "evidence", label: "Evidence" },
];

const graphGroupLabels: Record<string, string> = {
  process: "Process",
  material: "Materials",
  assay: "Assays",
  validation: "Validation",
};

function labNodeFromGraphNode(node: Node): LabNode {
  return node.data as unknown as LabNode;
}

function matchesNavigatorFilter(node: LabNode, filter: GraphNavigatorFilter) {
  if (filter === "all") return true;
  if (filter === "process") return node.node_type === "process";
  if (filter === "materials") return node.node_type === "material";
  if (filter === "assays") return node.node_type === "assay";
  if (filter === "validation") return node.node_type === "validation";
  if (filter === "risks") return node.state.status === "flagged" || node.metadata.confidence < 0.7 || node.learn_content?.risks?.length;
  if (filter === "evidence") return node.metadata.supporting_sources.length > 0;
  return true;
}

// --- Main Canvas Component ---
interface LabViewCanvasInnerProps {
  workflow: LabView;
  plan?: ExperimentPlan | null;
  hypothesis?: string;
  onRegenerate?: (newPlan: ExperimentPlan) => void;
}

function LabViewCanvasInner({ workflow, plan, hypothesis, onRegenerate }: LabViewCanvasInnerProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [learnMode, setLearnMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [regenModal, setRegenModal] = useState(false);
  const [regenNotes, setRegenNotes] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [regenBanner, setRegenBanner] = useState<string | null>(null);
  const [navigatorOpen, setNavigatorOpen] = useState(true);
  const [navigatorFilter, setNavigatorFilter] = useState<GraphNavigatorFilter>("all");
  const { fitView, getNodes, getEdges } = useReactFlow();

  // Build current LabView from canvas state
  const buildEditedLabView = useCallback((): LabView => {
    const currentNodes = getNodes().map(n => n.data as unknown as LabNode);
    const currentEdges = getEdges();
    return {
      version: (workflow.version ?? 1),
      nodes: currentNodes,
      edges: currentEdges.map(e => ({
        source: e.source,
        target: e.target,
        label: (e.label as string) ?? null,
        condition: null,
      })),
    };
  }, [getNodes, getEdges, workflow.version]);

  // Layout function
  const getLayoutedElements = useCallback((nodesData: LabNode[], edgesData: any[], isLearnMode: boolean) => {
    const layoutedNodes: Node[] = nodesData.map((n, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      return {
        id: n.id,
        type: 'labNode',
        position: { x: col * 320 + 50, y: row * (isLearnMode ? 200 : 150) + 50 },
        data: { 
          ...n, 
          showDescription: isLearnMode 
        },
      };
    });

    const layoutedEdges: Edge[] = edgesData.map((e, i) => ({
      id: `e-${e.source}-${e.target}-${i}`,
      source: e.source,
      target: e.target,
      label: e.label || "",
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 2 }
    }));

    return { layoutedNodes, layoutedEdges };
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Count user-edited nodes (version > 1) for diff badge — after useNodesState
  const editCount = useMemo(() => {
    return nodes.filter(n => (n.data as unknown as LabNode).state?.version > 1).length;
  }, [nodes]);

  const navigatorGroups = useMemo(() => {
    const groups = new Map<string, Node[]>();
    for (const node of nodes) {
      const labNode = labNodeFromGraphNode(node);
      if (!matchesNavigatorFilter(labNode, navigatorFilter)) continue;

      const groupKey = navigatorFilter === "risks" || navigatorFilter === "evidence"
        ? navigatorFilter
        : labNode.node_type;
      const current = groups.get(groupKey) ?? [];
      current.push(node);
      groups.set(groupKey, current);
    }

    return Array.from(groups.entries());
  }, [navigatorFilter, nodes]);


  // Initialize from props
  useEffect(() => {
    const { layoutedNodes, layoutedEdges } = getLayoutedElements(workflow.nodes, workflow.edges, learnMode);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 50);
  }, [workflow, learnMode, getLayoutedElements, setNodes, setEdges, fitView]);

  const onLayout = useCallback(() => {
    // Re-layout using current nodes data to preserve edits but reset positions
    const currentLabNodes = getNodes().map(n => n.data as unknown as LabNode);
    const { layoutedNodes } = getLayoutedElements(currentLabNodes, getEdges(), learnMode);
    setNodes(layoutedNodes);
    setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 50);
  }, [getLayoutedElements, learnMode, setNodes, fitView, getNodes, getEdges]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } }, eds));
  }, [setEdges]);

  const resetToGenerated = () => {
    if (confirm("Reset to generated graph? All manual edits will be lost.")) {
      const { layoutedNodes, layoutedEdges } = getLayoutedElements(workflow.nodes, workflow.edges, learnMode);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 50);
      setSelectedNodeId(null);
    }
  };

  const addNode = () => {
    const id = `manual-node-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'labNode',
      position: { x: 50, y: 50 },
      data: {
        id,
        node_type: "process",
        label: "New Conceptual Step",
        description: "Describe the high-level step...",
        fields: [],
        metadata: { confidence: 0, supporting_sources: [], assumptions: [] },
        state: { status: "flagged", version: 2 }, // Manual additions automatically flagged and v2
        showDescription: learnMode
      } as unknown as Record<string, unknown>
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(id);
  };

  const updateSelectedNode = (updates: Partial<LabNode>) => {
    setNodes((nds) => nds.map(n => {
      if (n.id === selectedNodeId) {
        const currentData = n.data as unknown as LabNode;
        return {
          ...n,
          data: {
            ...currentData,
            ...updates,
            state: { ...currentData.state, status: "flagged", version: (currentData.state?.version || 1) + 1 }
          }
        };
      }
      return n;
    }));
  };

  const deleteSelectedNode = () => {
    if (selectedNodeId) {
      setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
      setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
      setSelectedNodeId(null);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedNodeData = selectedNode?.data as (LabNode & { showDescription: boolean }) | undefined;

  return (
    <div className="relative flex h-[780px] w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-slate-50 to-slate-100/50 shadow-inner">
      {/* Lab View toolbar */}
      <div className="z-20 flex flex-col gap-2 border-b border-border/40 bg-white/95 px-4 py-2 backdrop-blur-sm xl:flex-row xl:items-center xl:justify-between shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            onClick={() => setNavigatorOpen((open) => !open)}
            title="Toggle Navigator"
            className="h-8 w-8 p-0 bg-transparent text-slate-500 shadow-none hover:bg-slate-100 hover:text-slate-800 border-0"
          >
            {navigatorOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <Button
            onClick={() => setEditMode(!editMode)}
            className={cn(
              "h-8 px-2.5 text-xs font-semibold shadow-none transition-colors",
              editMode ? "bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300" : "bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent"
            )}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit Mode
          </Button>
          <Button
            onClick={() => setLearnMode(!learnMode)}
            className={cn(
              "h-8 px-2.5 text-xs font-semibold shadow-none transition-colors",
              learnMode ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent"
            )}
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Learn Mode
          </Button>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <Button onClick={() => fitView({ duration: 800 })} className="h-8 px-2.5 text-xs font-medium bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent shadow-none">
            Fit View
          </Button>
          <Button onClick={onLayout} className="h-8 px-2.5 text-xs font-medium bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent shadow-none">
            <Layout className="w-3.5 h-3.5 mr-1.5" /> Auto Layout
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <Badge className="bg-slate-100 text-slate-500 border-transparent font-mono uppercase text-[9px] px-1.5 py-0">
              {nodes.length} Nodes
            </Badge>
            {editCount > 0 ? <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-mono uppercase text-[9px] px-1.5 py-0">{editCount} Edited</Badge> : null}
          </div>
          {editMode && (
            <>
              <Button onClick={addNode} className="h-8 px-2.5 text-xs font-medium bg-transparent text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-none">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Node
              </Button>
              <Button onClick={resetToGenerated} className="h-8 px-2.5 text-xs font-medium bg-transparent text-rose-600 hover:bg-rose-50 border border-rose-200 shadow-none">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
              </Button>
            </>
          )}
          {onRegenerate && plan && (
            <Button
              onClick={() => { setRegenError(null); setRegenModal(true); }}
              disabled={editCount === 0}
              className={cn(
                "h-8 px-3 text-xs font-bold shadow-none relative",
                editCount > 0
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-transparent text-slate-400 border border-border/60 cursor-not-allowed"
              )}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Regenerate Plan
              {editCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-white">
                  {editCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Collapsible navigator */}
        <div
          className={cn(
            "z-10 flex shrink-0 flex-col border-b border-border/40 bg-slate-50/80 backdrop-blur-md lg:border-b-0 lg:border-r transition-all duration-300",
            navigatorOpen ? "h-56 lg:h-full w-full lg:w-64" : "hidden"
          )}
        >
          <div className="flex items-center justify-between p-3 border-b border-border/40">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Navigator</h3>
            <button onClick={() => setNavigatorOpen(false)} className="text-slate-400 hover:text-slate-800">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-3 border-b border-border/40 bg-white/50">
            <div className="flex flex-wrap gap-1">
              {graphNavigatorFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setNavigatorFilter(filter.id)}
                  className={cn(
                    "rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                    navigatorFilter === filter.id
                      ? "bg-slate-800 text-white shadow-sm"
                      : "bg-transparent text-slate-500 hover:bg-slate-200"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {navigatorGroups.length === 0 ? (
              <div className="p-3 text-xs text-slate-400 italic text-center">
                No nodes match filter.
              </div>
            ) : (
              navigatorGroups.map(([group, groupNodes]) => (
                <div key={group} className="pt-2">
                  <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {group === "risks" ? "Risks" : group === "evidence" ? "Evidence" : graphGroupLabels[group] ?? group}
                  </div>
                  {groupNodes.map(n => {
                    const node = labNodeFromGraphNode(n);
                    const isRisk = node.state.status === "flagged" || node.metadata.confidence < 0.7;
                    const hasEvidence = node.metadata.supporting_sources.length > 0;
                    return (
                      <button
                        key={n.id}
                        onClick={() => setSelectedNodeId(n.id)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 text-xs rounded transition-colors border",
                          selectedNodeId === n.id
                            ? "bg-white border-slate-200 shadow-sm font-semibold text-slate-800"
                            : "bg-transparent border-transparent hover:bg-slate-200/50 text-slate-600"
                        )}
                      >
                        <div className="truncate">{n.data.label as string}</div>
                        {(isRisk || hasEvidence) && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {isRisk && <span className="text-[8px] font-mono uppercase text-amber-600">Risk</span>}
                            {hasEvidence && <span className="text-[8px] font-mono uppercase text-primary">Src</span>}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Canvas */}
        <div className="relative h-[560px] min-w-0 flex-1 lg:h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={editMode ? onConnect : undefined}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            nodesDraggable={editMode}
            nodesConnectable={editMode}
            elementsSelectable={true}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#cbd5e1" />
            <Controls className="bg-white border-border/40 shadow-sm" />
          </ReactFlow>
        </div>

      {/* Right Sidebar: Inspector */}
      {selectedNodeData && (
        <div className="z-10 flex h-80 w-full shrink-0 flex-col border-t border-border/40 bg-white shadow-xl lg:h-full lg:w-80 lg:border-l lg:border-t-0">
          <div className="px-4 py-3 border-b border-border/40 bg-slate-50/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center justify-between">
              {learnMode ? "Learn: Conceptual Overview" : "Inspector"}
              <button onClick={() => setSelectedNodeId(null)} className="hover:text-slate-800 bg-slate-200/50 rounded-full p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {editMode && !learnMode ? (
              <input 
                value={selectedNodeData.label}
                onChange={(e) => updateSelectedNode({ label: e.target.value })}
                className="w-full font-bold text-slate-800 leading-tight bg-white border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary/50"
              />
            ) : (
              <h3 className="font-bold text-slate-800 leading-tight">{selectedNodeData.label}</h3>
            )}
            
            <div className="mt-2 flex gap-2 items-center">
              {editMode && !learnMode ? (
                <select 
                  value={selectedNodeData.node_type}
                  onChange={(e) => updateSelectedNode({ node_type: e.target.value as any })}
                  className="text-[10px] font-mono bg-accent/10 text-accent px-2 py-0.5 rounded font-bold border border-accent/20 focus:outline-none"
                >
                  <option value="process">PROCESS</option>
                  <option value="material">MATERIAL</option>
                  <option value="assay">ASSAY</option>
                  <option value="validation">VALIDATION</option>
                </select>
              ) : (
                <div className="text-[10px] font-mono bg-accent/10 text-accent px-2 py-0.5 rounded inline-block font-bold">
                  TYPE: {selectedNodeData.node_type.toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className="p-5 flex-1 overflow-y-auto space-y-6">
            {learnMode ? (
              // --- LEARN MODE VIEW ---
              <div className="space-y-5">
                {selectedNodeData.learn_content ? (
                  <>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5">What is this?</div>
                      <p className="text-sm text-slate-700 leading-relaxed">{selectedNodeData.learn_content.what_is_this}</p>
                    </div>
                    
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5">Why is it important?</div>
                      <p className="text-sm text-slate-700 leading-relaxed">{selectedNodeData.learn_content.why_important}</p>
                    </div>
                    
                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1.5">Connection to Hypothesis</div>
                      <p className="text-xs text-blue-900 leading-relaxed">{selectedNodeData.learn_content.connection_to_hypothesis}</p>
                    </div>

                    {selectedNodeData.learn_content.common_alternatives.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Common Alternatives</div>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600">
                          {selectedNodeData.learn_content.common_alternatives.map((alt, i) => <li key={i}>{alt}</li>)}
                        </ul>
                      </div>
                    )}

                    {selectedNodeData.learn_content.risks.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-1.5">Typical Risks & Concerns</div>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-rose-700/80">
                          {selectedNodeData.learn_content.risks.map((risk, i) => <li key={i}>{risk}</li>)}
                        </ul>
                      </div>
                    )}
                    
                    {selectedNodeData.metadata.confidence < 0.7 && (
                      <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mt-4">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Low Confidence Note
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed">
                          This step is flagged with low confidence ({(selectedNodeData.metadata.confidence * 100).toFixed(0)}%). 
                          This usually means the underlying sources provide weak evidence, or there are significant unvalidated assumptions. 
                          Review the grounding tab for details.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-slate-500 italic text-center mt-10">
                    No educational content available for this manually added node.
                  </div>
                )}
              </div>
            ) : (
              // --- NORMAL / EDIT VIEW ---
              <>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Why this exists</div>
                  {editMode ? (
                    <textarea 
                      value={selectedNodeData.description}
                      onChange={(e) => updateSelectedNode({ description: e.target.value })}
                      className="w-full h-24 text-sm text-slate-700 leading-relaxed bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-primary/50 resize-none"
                      placeholder="Describe the high-level step... (No wet-lab protocols)"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 leading-relaxed">{selectedNodeData.description}</p>
                  )}
                </div>
                
                <div className="bg-slate-50 rounded-lg p-4 border border-border/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <Info className="h-3 w-3" /> Node Grounding
                  </div>
                  <div className="text-xs text-slate-600 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-border/40">
                      <strong className="text-slate-700">Confidence</strong> 
                      <span className={cn("font-mono px-1.5 py-0.5 rounded", selectedNodeData.metadata.confidence < 0.7 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50")}>
                        {(selectedNodeData.metadata.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    
                    <div className="pb-2 border-b border-border/40">
                      <strong className="block text-slate-700 mb-1.5">Supporting Sources:</strong>
                      {selectedNodeData.metadata.supporting_sources.length > 0 ? (
                        <ul className="space-y-1">
                          {selectedNodeData.metadata.supporting_sources.map((url, i) => (
                            <li key={i}>
                              <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline font-mono text-[10px] truncate">
                                <ExternalLink className="w-3 shrink-0 h-3" /> <span className="truncate">{url}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground italic text-[10px]">No sources (Manual Node)</span>
                      )}
                    </div>

                    <div>
                      <strong className="block text-slate-700 mb-1.5">Assumptions:</strong>
                      {selectedNodeData.metadata.assumptions.length > 0 ? (
                        <ul className="list-disc pl-4 space-y-1.5 text-slate-500 text-[11px] leading-relaxed">
                          {selectedNodeData.metadata.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground italic text-[10px]">None explicitly stated</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {editMode && (
                  <div className="bg-amber-50/50 rounded-lg p-4 border border-amber-200/60 mt-4">
                    <div className="text-xs text-amber-800 leading-snug">
                      <strong>Safety Note:</strong> Any manual edits automatically flag this node for PI review to prevent actionable wet-lab procedures from bypassing safety checks.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {!learnMode && (
            <div className="p-5 border-t border-border/40 bg-white flex flex-col gap-2">
              {!editMode ? (
                <Button 
                  className="w-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 shadow-sm" 
                  onClick={() => {
                    const event = new CustomEvent('flag-node', { detail: { node: selectedNodeData } });
                    window.dispatchEvent(event);
                  }}
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Flag Node for Review
                </Button>
              ) : (
                <Button 
                  className="w-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 shadow-sm" 
                  onClick={deleteSelectedNode}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Node
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Regen success banner */}
      {regenBanner && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-600 text-white text-sm font-bold px-5 py-3 rounded-xl shadow-xl">
          <RefreshCw className="w-4 h-4" />
          {regenBanner}
          <button onClick={() => setRegenBanner(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Regenerate confirmation modal */}
      {regenModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-7 w-[420px] max-w-full mx-4 flex flex-col gap-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">Regenerate Plan from Graph?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {editCount} node{editCount !== 1 ? "s" : ""} edited. A new plan draft will be generated reflecting your changes.
                  Your current plan is preserved until the new one loads.
                </p>
              </div>
              <button onClick={() => setRegenModal(false)} className="text-slate-400 hover:text-slate-800 ml-3">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Optional: Additional notes for regeneration
              </label>
              <textarea
                value={regenNotes}
                onChange={e => setRegenNotes(e.target.value)}
                placeholder="e.g. Focus on reducing budget, strengthen validation section..."
                className="w-full h-20 text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-primary/50"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <strong>Safety:</strong> Regeneration stays high-level and conceptual. No operational wet-lab procedures will be introduced. PI review required before execution.
            </div>

            {regenError && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800">
                {regenError}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => setRegenModal(false)}
                className="flex-1 bg-transparent border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-none"
                disabled={regenLoading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={regenLoading || !plan}
                onClick={async () => {
                  if (!plan || !onRegenerate) return;
                  setRegenLoading(true);
                  setRegenError(null);
                  try {
                    const editedView = buildEditedLabView();
                    const newPlan = await regenerateFromLabView({
                      hypothesis: hypothesis ?? plan.hypothesis,
                      currentPlan: plan,
                      editedLabView: editedView,
                      userNotes: regenNotes || undefined,
                    });
                    onRegenerate(newPlan);
                    setRegenModal(false);
                    setRegenNotes("");
                    const summary = `Plan regenerated from ${editCount} graph edit${editCount !== 1 ? "s" : ""}.`;
                    setRegenBanner(summary);
                    setTimeout(() => setRegenBanner(null), 5000);
                  } catch (e: unknown) {
                    setRegenError(e instanceof Error ? e.message : "Regeneration failed. Check backend connection.");
                  } finally {
                    setRegenLoading(false);
                  }
                }}
              >
                {regenLoading ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Regenerating...</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" /> Regenerate Plan</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface LabViewCanvasProps {
  workflow?: LabView | null;
  plan?: ExperimentPlan | null;
  hypothesis?: string;
  loading?: boolean;
  onRegenerate?: (newPlan: ExperimentPlan) => void;
}

// Skeleton shimmer for loading state
function LabViewSkeleton() {
  return (
    <div className="relative flex h-[540px] w-full overflow-hidden rounded-xl border border-border/40 bg-slate-50/60">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-30"
        style={{ backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />
      {/* Skeleton nodes */}
      <div className="relative z-10 w-full h-full flex items-center justify-center gap-10">
        {[0, 1, 2].map((col) => (
          <div key={col} className="flex flex-col gap-6 items-center" style={{ marginTop: col === 1 ? 60 : 0 }}>
            {[0, 1].map((row) => (
              <div
                key={row}
                className="w-[220px] h-[90px] rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="h-full w-full animate-pulse bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 bg-[length:400%_100%]"
                  style={{ animation: "shimmer 1.8s ease-in-out infinite", backgroundSize: "400% 100%" }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Loading label */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-white/90 backdrop-blur border border-border/40 rounded-full px-5 py-2 shadow-sm">
        <svg className="w-4 h-4 text-primary animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
        </svg>
        <span className="text-xs font-bold text-slate-600 tracking-wide uppercase">Generating Lab Workflow…</span>
      </div>
      <style>{`@keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }`}</style>
    </div>
  );
}

// Polished empty state
function LabViewEmptyState() {
  return (
    <div className="flex h-[540px] flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-gradient-to-br from-slate-50 to-white gap-6 px-8">
      {/* Icon cluster */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center shadow-sm">
          <svg className="w-8 h-8 text-primary/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="5" cy="12" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="19" cy="19" r="2" />
            <path d="M7 12h5m4-5.5-5 4.5m5 5.5-5-4.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="absolute -right-2 -bottom-2 w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        </div>
      </div>
      {/* Text */}
      <div className="text-center max-w-xs">
        <p className="font-black text-slate-800 text-base mb-1.5">No Lab Workflow Yet</p>
        <p className="text-sm text-slate-500 leading-relaxed">
          Generate a plan to see the Lab View graph, or load a demo to explore the node editor.
        </p>
      </div>
      {/* Status chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {["process", "material", "assay", "validation"].map((type) => (
          <span key={type} className={cn(
            "font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border",
            type === "process" ? "bg-blue-50 text-blue-600 border-blue-200" :
            type === "material" ? "bg-amber-50 text-amber-600 border-amber-200" :
            type === "assay" ? "bg-purple-50 text-purple-600 border-purple-200" :
            "bg-emerald-50 text-emerald-600 border-emerald-200"
          )}>
            {type}
          </span>
        ))}
      </div>
      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Lab View · v0 · No data</p>
    </div>
  );
}

export function LabViewCanvas({ workflow, plan, hypothesis, loading, onRegenerate }: LabViewCanvasProps) {
  if (loading) return <LabViewSkeleton />;

  if (!workflow || !workflow.nodes || workflow.nodes.length === 0) {
    return <LabViewEmptyState />;
  }

  return (
    <ReactFlowProvider>
      <LabViewCanvasInner
        workflow={workflow}
        plan={plan}
        hypothesis={hypothesis}
        onRegenerate={onRegenerate}
      />
    </ReactFlowProvider>
  );
}
