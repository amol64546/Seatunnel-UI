import { useEffect } from 'react';

export function useDeleteKeyHandler({
  showConfigModal,
  showEnvConfigModal,
  selectedNode,
  selectedEdge,
  setNodes,
  setEdges,
  setSelectedNode,
  setSelectedEdge
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['Delete', 'Backspace'].includes(e.key)) {
        if (showConfigModal || showEnvConfigModal) return;
        if (selectedNode) {
          setNodes(nodes => nodes.filter(n => n.id !== selectedNode.id));
          setEdges(edges => edges.filter(
            e => e.source !== selectedNode.id && e.target !== selectedNode.id
          ));
          setSelectedNode(null);
        } else if (selectedEdge) {
          setEdges(edges => edges.filter(e => e.id !== selectedEdge.id));
          setSelectedEdge(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showConfigModal,
    showEnvConfigModal,
    selectedNode,
    selectedEdge,
    setNodes,
    setEdges,
    setSelectedNode,
    setSelectedEdge
  ]);
}
