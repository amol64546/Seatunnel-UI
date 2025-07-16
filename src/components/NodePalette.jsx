import React from 'react';

function NodePalette() {
  return (
    <>
      <div className="dndnode source" draggable onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'source')}>
        Source
      </div>
      <div className="dndnode transform" draggable onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'transform')}>
        Transform
      </div>
      <div className="dndnode sink" draggable onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'sink')}>
        Sink
      </div>
    </>
  );
}

export default NodePalette;