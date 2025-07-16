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
import { nodeTypes } from './customNodes';
import ValueEditor from './ValueEditor';
import EnvConfigPanel from './EnvConfigPanel';
import { defaultEnvConfig } from '../constants/envConfig';
import { SOURCE_PLUGINS, TRANSFORM_PLUGINS, SINK_PLUGINS } from '../constants/plugins';
import { PLUGIN_TEMPLATES } from '../constants/pluginTemplates';


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

  const [selectedPlugin, setSelectedPlugin] = useState('');
  const [tempPlugin, setTempPlugin] = useState('');

  const [queryParams, setQueryParams] = useState({
    isStartWithSavePoint: false,
    jobId: '',
    jobName: ''
  });

  // 1. Memoized node data validation
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

  // 2. Effect for data validation
  useEffect(() => {
    if (nodes.length > 0 && nodes.some(n => !n.data?.connectorType)) {
      setNodes(nodesWithValidConnectors);
    }
  }, [nodes, nodesWithValidConnectors, setNodes]);

  // 3. Effect for keyboard handling 
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['Delete', 'Backspace'].includes(e.key)) {
        // Skip if modal is open or if editing a field
        if (showConfigModal || showEnvConfigModal) return;

        if (selectedNode) {
          // if (window.confirm('Are you sure you want to delete this node?')) {
          setNodes(nodes => nodes.filter(n => n.id !== selectedNode.id));
          setEdges(edges => edges.filter(
            e => e.source !== selectedNode.id && e.target !== selectedNode.id
          ));
          setSelectedNode(null);
          // }
        }
        else if (selectedEdge) {
          // if (window.confirm('Are you sure you want to delete this connection?')) {
          setEdges(edges => edges.filter(e => e.id !== selectedEdge.id));
          setSelectedEdge(null);
          // }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, selectedEdge, setNodes, setEdges]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onEdgeUpdate = useCallback(
    (oldEdge, newConnection) => {
      setEdges((els) => updateEdge(oldEdge, newConnection, els));
    },
    [setEdges]
  );

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      // Get default plugin based on node type
      const defaultPlugin = type === 'source' ? 'FakeSource' :
        type === 'transform' ? 'Metadata' : 'Console';

      // Load template immediately
      let template = PLUGIN_TEMPLATES[type]?.[defaultPlugin] || {};

      // Get the mouse position relative to the viewport
      const mousePosition = {
        x: event.clientX,
        y: event.clientY,
      };

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
    [reactFlowInstance]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setSelectedEdge(null); // Clear edge selection when node is selected
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null); // Clear node selection when edge is selected
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null); // Clear both selections when clicking empty space
  }, []);

  const getValueType = (value) => {
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';
    return typeof value; // 'boolean', 'number', 'string', etc.
  };

  const onNodeDoubleClick = useCallback((event, node) => {
    setSelectedNode(node);
    setTempPlugin(node.data.connectorType || '');

    try {
      // Convert the nested config to editable fields while maintaining structure
      const processConfig = (config) => {
        return Object.entries(config || {}).map(([key, value]) => ({
          key,
          value,
          valueType: getValueType(value),
          // For objects/arrays, recursively process their contents
          ...(typeof value === 'object' && value !== null && !Array.isArray(value)
            ? { children: processConfig(value) }
            : {}),
          ...(Array.isArray(value)
            ? {
              children: value.map((item, index) => ({
                key: index.toString(),
                value: item,
                valueType: getValueType(item),
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
      setConfigFields([]); // Fallback to empty
    }

    setShowConfigModal(true);
  }, []);


  // In your config modal component
  const getDefaultForType = (valueType) => {
    switch (valueType) {
      case 'array': return [];
      case 'object': return {};
      case 'boolean': return false;
      case 'number': return 0;
      case 'string': return '';
      default: return null;
    }
  };

  // Usage when adding new fields
  const handleAddConfigField = (type = 'string') => {
    setConfigFields([...configFields, {
      key: '',
      value: getDefaultForType(type),
      valueType: type
    }]);
  };

  const handleConfigFieldChange = (index, field, value) => {
    const updatedFields = [...configFields];
    if (field === 'value') {
      updatedFields[index].value = value;
      updatedFields[index].valueType = typeof value === 'boolean' ? 'boolean' :
        Array.isArray(value) ? 'array' :
          typeof value === 'object' ? 'object' :
            typeof value === 'number' ? 'number' : 'string';
    } else {
      updatedFields[index][field] = value;
    }
    setConfigFields(updatedFields);
  };

  const handleRemoveConfigField = (index) => {
    const updatedFields = [...configFields];
    updatedFields.splice(index, 1);
    setConfigFields(updatedFields);
  };

  const handleFieldKeyDown = (e, index) => {
    if (['Delete', 'Backspace'].includes(e.key) && e.target.value === '') {
      e.preventDefault();
      handleRemoveConfigField(index);
    }
  };

  const handleConfigSubmit = (e) => {
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
  };

  const validatePipeline = () => {
    const sources = nodes.filter(n => n.type === 'source');
    const sinks = nodes.filter(n => n.type === 'sink');

    if (sources.length === 0) return { valid: false, message: 'Pipeline must have at least one source' };
    if (sinks.length === 0) return { valid: false, message: 'Pipeline must have at least one sink' };

    // New validation: Check if at least one source is connected to a sink
    const hasValidConnection = edges.some(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      // Check if this edge connects a source to a sink (directly or via transforms)
      if (sourceNode?.type === 'source' && targetNode?.type === 'sink') {
        return true; // Direct connection
      }

      // Check for source → transform → sink paths
      if (sourceNode?.type === 'source' && targetNode?.type === 'transform') {
        // Check if this transform connects to any sink
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


  // Add this handler function
  const handleQueryParamChange = (field, value) => {
    setQueryParams(prev => ({
      ...prev,
      [field]: field === 'isStartWithSavePoint' ? Boolean(value) : value
    }));
  };

  const submitPipeline = async () => {
    const validation = validatePipeline();
    if (!validation.valid) {
      alert(validation.message);
      return;
    }


    // Generate sequential IDs for outputs and inputs
    let outputCounter = 1;
    let inputCounter = 1;
    const outputMap = {};
    const inputMap = {};

    // First pass: assign output IDs to sources and transforms
    nodes.forEach(node => {
      if (node.type === 'source' || node.type === 'transform') {
        outputMap[node.id] = `output_${outputCounter++}`;
      }
    });

    // Second pass: assign input IDs to transforms and sinks
    nodes.forEach(node => {
      if (node.type === 'transform' || node.type === 'sink') {
        inputMap[node.id] = `input_${inputCounter++}`;
      }
    });

    // Build the pipeline config
    const pipelineConfig = {
      env: envConfig,
      source: nodes.filter(n => n.type === 'source').map(node => ({
        plugin_name: node.data.plugin_name || node.data.connectorType,
        ...node.data.config,
        plugin_output: outputMap[node.id]
      })),
      transform: nodes.filter(n => n.type === 'transform').map(node => {
        const inputs = edges
          .filter(edge => edge.target === node.id)
          .map(edge => outputMap[edge.source]);

        return {
          plugin_name: node.data.plugin_name || node.data.connectorType,
          ...node.data.config,
          plugin_input: inputs,
          plugin_output: inputMap[node.id] // Note: using input ID as transform output
        };
      }),
      sink: nodes.filter(n => n.type === 'sink').map(node => {
        const inputs = edges
          .filter(edge => edge.target === node.id)
          .map(edge =>
            // Use outputMap if coming from source, inputMap if coming from transform
            nodes.find(n => n.id === edge.source)?.type === 'transform'
              ? inputMap[edge.source]
              : outputMap[edge.source]
          );

        return {
          plugin_name: node.data.plugin_name || node.data.connectorType,
          ...node.data.config,
          plugin_input: inputs
        };
      })
    };

    // Debug log to check final payload
    console.log('Submitting payload:', pipelineConfig);

    // Build query string
    const queryString = Object.entries(queryParams)
      .filter(([_, value]) => value !== '' && value !== false)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    const url = `/submit-job${queryString ? `?${queryString}` : ''}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pipelineConfig)
      });
      const result = await response.json();
      alert(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error submitting job:', error);
      alert('Failed to submit job');
    }
  };

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
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        deleteKeyCode={['Delete', 'Backspace']} // Enable deletion with both keys
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
          <div className="dndnode source" draggable onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'source')}>
            Source
          </div>
          <div className="dndnode transform" draggable onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'transform')}>
            Transform
          </div>
          <div className="dndnode sink" draggable onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'sink')}>
            Sink
          </div>
          <button
            onClick={() => setShowEnvConfigModal(true)}
            className="env-config-btn"
          >
            Environment Config
          </button>
          <div className="query-params-section">
            <h4>Job Parameters</h4>
            <div className="query-param-row">
              <label>
                <input
                  type="checkbox"
                  checked={queryParams.isStartWithSavePoint}
                  onChange={(e) => handleQueryParamChange('isStartWithSavePoint', e.target.checked)}
                />
                Start with Savepoint
              </label>
            </div>
            <div className="query-param-row">
              <input
                type="text"
                placeholder="Job ID (optional)"
                value={queryParams.jobId}
                onChange={(e) => handleQueryParamChange('jobId', e.target.value)}
              />
            </div>
            <div className="query-param-row">
              <input
                type="text"
                placeholder="Job Name (optional)"
                value={queryParams.jobName}
                onChange={(e) => handleQueryParamChange('jobName', e.target.value)}
              />
            </div>
          </div>
          <button onClick={submitPipeline} className="submit-btn">
            Submit Pipeline
          </button>
        </Panel>

        <Panel position="bottom-center">
          {selectedNode ? (
            <div className="delete-hint">
              Press Delete key to remove selected node
            </div>
          ) : selectedEdge ? (
            <div className="delete-hint">
              Press Delete key to remove selected connection
            </div>
          ) : null}
        </Panel>
      </ReactFlow>

      {showConfigModal && (
        <div className="modal-overlay">
          <div className="config-modal">
            <h3>Configure {selectedNode.type}</h3>
            <form onSubmit={handleConfigSubmit}>
              <label>
                Plugin Name:
                <select
                  name="plugin_name"
                  value={tempPlugin}
                  onChange={(e) => {
                    const selectedPluginName = e.target.value;
                    setTempPlugin(selectedPluginName);
                    // Load template for selected plugin
                    const template = PLUGIN_TEMPLATES[selectedNode.type]?.[selectedPluginName] || {};
                    const fields = Object.entries(template).map(([key, value]) => ({
                      key,
                      value,
                      valueType: typeof value === 'boolean' ? 'boolean' :
                        Array.isArray(value) ? 'array' :
                          typeof value === 'object' ? 'object' :
                            typeof value === 'number' ? 'number' : 'string'
                    }));

                    setConfigFields(fields);
                  }}
                  required
                >
                  <option value="">Select a plugin</option>
                  {selectedNode.type === 'source' && SOURCE_PLUGINS.map(plugin => (
                    <option key={plugin} value={plugin}>{plugin}</option>
                  ))}
                  {selectedNode.type === 'transform' && TRANSFORM_PLUGINS.map(plugin => (
                    <option key={plugin} value={plugin}>{plugin}</option>
                  ))}
                  {selectedNode.type === 'sink' && SINK_PLUGINS.map(plugin => (
                    <option key={plugin} value={plugin}>{plugin}</option>
                  ))}
                </select>
              </label>

              <div className="config-fields">
                <h4>Configuration:</h4>
                {configFields.map((field, index) => (
                  <div key={index} className="config-field-row">
                    <input
                      type="text"
                      placeholder="Field name"
                      value={field.key}
                      onChange={(e) => handleConfigFieldChange(index, 'key', e.target.value)}
                      onKeyDown={(e) => handleFieldKeyDown(e, index)}
                      required
                    />
                    <ValueEditor
                      value={field.value}
                      onChange={(value) => handleConfigFieldChange(index, 'value', value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveConfigField(index)}
                      className="remove-field"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddConfigField}
                  className="add-field"
                >
                  Add Configuration Field
                </button>
              </div>


              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    // Reset to original plugin value when cancelling
                    setNodes(nds => nds.map(n => {
                      if (n.id === selectedNode.id) {
                        return {
                          ...n,
                          data: {
                            ...n.data,
                            connectorType: selectedNode.data.connectorType // Revert to original
                          }
                        };
                      }
                      return n;
                    }));
                    setShowConfigModal(false);
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-btn"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
