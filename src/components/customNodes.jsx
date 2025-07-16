import { Handle, Position } from 'reactflow';


export const SourceNode = ({ data, selected }) => {
  return (
    <div className={`source-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        Source: {data.connectorType || 'FakeSource'}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export const TransformNode = ({ data, selected }) => {
  return (
    <div className={`transform-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        Transform: {data.connectorType || 'Metadata'}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export const SinkNode = ({ data, selected }) => {
  return (
    <div className={`sink-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        Sink: {data.connectorType || 'Console'}</div>
      <Handle type="target" position={Position.Left} />
    </div>
  );
};

export const nodeTypes = {
  source: SourceNode,
  transform: TransformNode,
  sink: SinkNode,
};
