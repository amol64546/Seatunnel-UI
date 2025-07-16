import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  Position,
  updateEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import NodeConfigModal from './NodeConfigModal';
import JobParamsPanel from './JobParamsPanel';
import DeleteHintPanel from './DeleteHintPanel';
import NodePalette from './NodePalette';
import EnvConfigPanel from './EnvConfigPanel';
import { usePipelineSubmission } from '../hooks/usePipelineSubmission';
import { useDeleteKeyHandler } from '../hooks/useDeleteKeyHandler';
import { defaultEnvConfig } from './EnvConfigPanel';
import { PLUGIN_TEMPLATES } from '../constants/pluginTemplates';
import { nodeTypes } from './customNodes';

function FlowBuilder() {
  // State declarations
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showEnvConfigModal, setShowEnvConfigModal] = useState(false);
  const [envConfig, setEnvConfig] = useState(defaultEnvConfig);
  const [configFields, setConfigFields] = useState([]);
  const [tempPlugin, setTempPlugin] = useState('');
  const [queryParams, setQueryParams] = useState({
    isStartWithSavePoint: false,
    jobId: '',
    jobName: ''
  });

  // Memoized node data validation
  const nodesWithValidConnectors = useMemo(() => {
    return nodes.map(node => {
      if (node.data?.connectorType) return node;

      return {
        ...node,
        data: {
          ...node.data,
          connectorType:
            node.type === 'source' ? 'FakeSource' :
            node.type === 'transform' ? 'Metadata' : 'Console'
        }
      };
    });
  }, [nodes]);

  // Effect for data validation
  useEffect(() => {
    if (nodes.length > 0 && nodes.some(n => !n.data?.connectorType)) {
      setNodes(nodesWithValidConnectors);
    }
  }, [nodes, nodesWithValidConnectors, setNodes]);

  // Custom hook for delete key handling
  useDeleteKeyHandler({
    showConfigModal,
    showEnvConfigModal,
    selectedNode,
    selectedEdge,
    setNodes,
    setEdges,
    setSelectedNode,
    setSelectedEdge
  });

  // Move validatePipeline above the usePipelineSubmission hook
  const validatePipeline = () => {
    const sources = nodes.filter(n => n.type === 'source');
    const sinks = nodes.filter(n => n.type === 'sink');

    if (sources.length === 0) return { valid: false, message: 'Pipeline must have at least one source' };
    if (sinks.length === 0) return { valid: false, message: 'Pipeline must have at least one sink' };

    const hasValidConnection = edges.some(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      if (sourceNode?.type === 'source' && targetNode?.type === 'sink') return true;

      if (sourceNode?.type === 'source' && targetNode?.type === 'transform') {
        return edges.some(e =>
          e.source === targetNode.id &&
          nodes.find(n => n.id === e.target)?.type === 'sink'
        );
      }

      return false;
    });

    if (!hasValidConnection) {
      return {
        valid: false,
        message: 'At least one source must be connected to a sink (directly or via transforms)'
      };
    }

    return { valid: true };
  };

  // Custom hook for pipeline submission
  const { submitPipeline } = usePipelineSubmission(
    nodes,
    edges,
    envConfig,
    queryParams,
    validatePipeline,
    setNodes
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const defaultPlugin = type === 'source' ? 'FakeSource' :
        type === 'transform' ? 'Metadata' : 'Console';

      const template = PLUGIN_TEMPLATES[type]?.[defaultPlugin] || {};
      const mousePosition = { x: event.clientX, y: event.clientY };
      const position = reactFlowInstance.screenToFlowPosition(mousePosition);

      const newNode = {
        id: `${Date.now()}`,
        type,
        position,
        data: {
          label: `${type} node`,
          connectorType: defaultPlugin,
          config: { ...template }
        },
        sourcePosition: type === 'source' || type === 'transform' ? Position.Right : undefined,
        targetPosition: type === 'transform' || type === 'sink' ? Position.Left : undefined,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeDoubleClick = useCallback((event, node) => {
    setSelectedNode(node);
    setTempPlugin(node.data.connectorType || '');

    try {
      const processConfig = (config) => {
        return Object.entries(config || {}).map(([key, value]) => ({
          key,
          value,
          valueType: Array.isArray(value) ? 'array' :
            typeof value === 'object' && value !== null ? 'object' : typeof value,
          ...(typeof value === 'object' && value !== null && !Array.isArray(value)
            ? { children: processConfig(value) }
            : {}),
          ...(Array.isArray(value)
            ? {
              children: value.map((item, index) => ({
                key: index.toString(),
                value: item,
                valueType: typeof item,
                ...(typeof item === 'object' && item !== null
                  ? { children: processConfig(item) }
                  : {})
              }))
            }
            : {})
        }));
      };

      const fields = processConfig(node.data.config);
      setConfigFields(fields);
    } catch (error) {
      console.error('Failed to parse node config:', error);
      setConfigFields([]);
    }

    setShowConfigModal(true);
  }, []);

  const handleQueryParamChange = (field, value) => {
    setQueryParams(prev => ({
      ...prev,
      [field]: field === 'isStartWithSavePoint' ? Boolean(value) : value
    }));
  };

  const onEdgeUpdate = useCallback(
    (oldEdge, newConnection) =>
      setEdges((eds) => {
        const updatedEdges = eds.filter((e) => e.id !== oldEdge.id);
        return addEdge({ ...newConnection, markerEnd: { type: MarkerType.ArrowClosed } }, updatedEdges);
      }),
    [setEdges]
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes.map(node => ({
          ...node,
          selected: selectedNode?.id === node.id
        }))}
        edges={edges.map(edge => ({
          ...edge,
          selected: selectedEdge?.id === edge.id
        }))}
        onEdgeClick={(event, edge) => setSelectedEdge(edge)}
        onNodeClick={(event, node) => setSelectedNode(node)}
        onPaneClick={() => {
          setSelectedNode(null);
          setSelectedEdge(null);
        }}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        deleteKeyCode={['Delete', 'Backspace']}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeUpdate={onEdgeUpdate}
        connectionLineStyle={{ stroke: '#ddd', strokeWidth: 2 }}
        connectionLineType="bezier"
        connectionMode="strict"
        isValidConnection={(connection) => {
          const sourceNode = nodes.find(n => n.id === connection.source);
          const targetNode = nodes.find(n => n.id === connection.target);

          if (sourceNode.type === 'source') {
            return targetNode.type === 'transform' || targetNode.type === 'sink';
          }

          if (sourceNode.type === 'transform') {
            return targetNode.type === 'transform' || targetNode.type === 'sink';
          }

          return false;
        }}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background />
        <Panel position="top-right">
          <NodePalette />
          <button
            onClick={() => setShowEnvConfigModal(true)}
            className="env-config-btn"
          >
            Environment Config
          </button>
          <JobParamsPanel
            queryParams={queryParams}
            handleQueryParamChange={handleQueryParamChange}
          />
          <button onClick={submitPipeline} className="submit-btn">
            Submit Pipeline
          </button>
        </Panel>
        <Panel position="bottom-center">
          <DeleteHintPanel selectedNode={selectedNode} selectedEdge={selectedEdge} />
        </Panel>
      </ReactFlow>

      <NodeConfigModal
        show={showConfigModal}
        selectedNode={selectedNode}
        tempPlugin={tempPlugin}
        setTempPlugin={setTempPlugin}
        configFields={configFields}
        setConfigFields={setConfigFields}
        handleConfigFieldChange={(index, field, value) => {
          const updatedFields = [...configFields];
          updatedFields[index][field] = value;
          setConfigFields(updatedFields);
        }}
        handleFieldKeyDown={(e, index) => {
          if (['Delete', 'Backspace'].includes(e.key) && e.target.value === '') {
            e.preventDefault();
            const updatedFields = [...configFields];
            updatedFields.splice(index, 1);
            setConfigFields(updatedFields);
          }
        }}
        handleRemoveConfigField={(index) => {
          const updatedFields = [...configFields];
          updatedFields.splice(index, 1);
          setConfigFields(updatedFields);
        }}
        handleAddConfigField={() => {
          setConfigFields([...configFields, { key: '', value: '', valueType: 'string' }]);
        }}
        handleConfigSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const pluginName = formData.get('plugin_name');

          const config = {};
          configFields.forEach((field) => {
            if (field.key && field.value !== undefined) {
              config[field.key] = field.value;
            }
          });

          setNodes((nds) => nds.map((node) => {
            if (node.id === selectedNode.id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  connectorType: pluginName,
                  config
                }
              };
            }
            return node;
          }));

          setShowConfigModal(false);
          setConfigFields([]);
        }}
        setShowConfigModal={setShowConfigModal}
        setNodes={setNodes}
      />

      {showEnvConfigModal && (
        <EnvConfigPanel
          envConfig={envConfig}
          setEnvConfig={setEnvConfig}
          onClose={() => setShowEnvConfigModal(false)}
        />
      )}
    </div>
  );
}

export default FlowBuilder;