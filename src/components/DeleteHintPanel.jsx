import React from 'react';

function DeleteHintPanel({ selectedNode, selectedEdge }) {
  if (selectedNode) {
    return <div className="delete-hint">Press Delete key to remove selected node</div>;
  }
  if (selectedEdge) {
    return <div className="delete-hint">Press Delete key to remove selected connection</div>;
  }
  return null;
}

export default DeleteHintPanel;