import React from 'react';
import ValueEditor from './ValueEditor';
import { PLUGIN_TEMPLATES } from '../constants/pluginTemplates';
import { SOURCE_PLUGINS, TRANSFORM_PLUGINS, SINK_PLUGINS } from '../constants/plugins';

function NodeConfigModal({
  show,
  selectedNode,
  tempPlugin,
  setTempPlugin,
  configFields,
  setConfigFields,
  handleConfigFieldChange,
  handleFieldKeyDown,
  handleRemoveConfigField,
  handleAddConfigField,
  handleConfigSubmit,
  setShowConfigModal,
  setNodes
}) {
  if (!show || !selectedNode) return null;

  return (
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
                setNodes(nds => nds.map(n => {
                  if (n.id === selectedNode.id) {
                    return {
                      ...n,
                      data: {
                        ...n.data,
                        connectorType: selectedNode.data.connectorType
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
  );
}

export default NodeConfigModal;