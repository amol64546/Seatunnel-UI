import React, { useState } from 'react';

export const defaultEnvConfig = {
  "job.mode": "BATCH",
  "parallelism": 1,
  "job.retry.times": 3,
  "job.retry.interval.seconds": 3,
  "checkpoint.interval": 30000,
  "checkpoint.timeout": 300000,  
  "read_limit.rows_per_second": 400,
  "read_limit.bytes_per_second": 7000000
};

const EnvConfigPanel = ({ envConfig, setEnvConfig, onClose }) => {
  const [config, setConfig] = useState(envConfig);
  const [newFields, setNewFields] = useState([]);

  React.useEffect(() => {
    const additionalFields = Object.entries(config).filter(([key]) => !Object.keys(defaultEnvConfig).includes(key));
    setNewFields(additionalFields.map(([key, value]) => ({
      key,
      value,
      valueType: typeof value === 'boolean' ? 'boolean' :
                Array.isArray(value) ? 'array' :
                typeof value === 'object' ? 'object' :
                typeof value === 'number' ? 'number' : 'string'
    })));
  }, [config]);

  const handleChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: key === 'parallelism' || 
             key === 'job.retry.times' || 
             key === 'job.retry.interval.seconds' || 
             key === 'checkpoint.interval' || 
             key === 'checkpoint.timeout' || 
             key === 'read_limit.rows_per_second' || 
             key === 'read_limit.bytes_per_second' 
             ? Number(value) 
             : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedConfig = Object.fromEntries(
      Object.entries(config).map(([key, value]) => [
        key, 
        value === null ? undefined : value
      ])
    );

    newFields.forEach((field) => {
      if (field.key && field.value !== undefined) {
        cleanedConfig[field.key] = field.valueType === 'number' ? Number(field.value) :
                                   field.valueType === 'boolean' ? field.value === 'true' :
                                   field.valueType === 'array' ? JSON.parse(field.value) :
                                   field.valueType === 'object' ? JSON.parse(field.value) :
                                   field.value;
      }
    });

    setEnvConfig(cleanedConfig);
    onClose();
  };

  const handleReset = () => {
    setConfig(defaultEnvConfig);
  };

  const handleAddField = () => {
    setNewFields([...newFields, { 
      key: '', 
      value: '', 
      valueType: 'string', 
      defaultValue: 'string' 
    }]);
  };

  const handleFieldChange = (index, field, value) => {
    const updatedFields = [...newFields];
    updatedFields[index][field] = value;

    if (field === 'valueType') {
      updatedFields[index].value = value === 'number' ? 0 :
                                   value === 'boolean' ? false :
                                   value === 'array' ? '[]' :
                                   value === 'object' ? '{}' :
                                   '';
    }

    setNewFields(updatedFields);
  };

  const handleRemoveField = (index) => {
    const updatedFields = [...newFields];
    updatedFields.splice(index, 1);
    setNewFields(updatedFields);
  };

  return (
    <div className="modal-overlay">
      <div className="config-modal env-config-modal">
        <h3>Environment Configuration <span className="default-hint">(Values shown are defaults)</span></h3>
        <form onSubmit={handleSubmit}>
          <div className="env-config-grid">
            <div className="env-config-item">
              <label>Job Mode:</label>
              <select 
                value={config["job.mode"]} 
                onChange={(e) => handleChange("job.mode", e.target.value)}
              >
                <option value="BATCH">BATCH</option>
                <option value="STREAMING">STREAMING</option>
              </select>
            </div>

            <div className="env-config-item">
              <label>Parallelism:</label>
              <input
                type="number"
                min="1"
                value={config.parallelism}
                onChange={(e) => handleChange("parallelism", e.target.value)}
              />
            </div>

            <div className="env-config-item">
              <label>Retry Times:</label>
              <input
                type="number"
                min="0"
                value={config["job.retry.times"]}
                onChange={(e) => handleChange("job.retry.times", e.target.value)}
              />
            </div>

            <div className="env-config-item">
              <label>Retry Interval (s):</label>
              <input
                type="number"
                min="1"
                value={config["job.retry.interval.seconds"]}
                onChange={(e) => handleChange("job.retry.interval.seconds", e.target.value)}
              />
            </div>

            <div className="env-config-item">
              <label>Checkpoint Interval (ms):</label>
              <input
                type="number"
                min="0"
                value={config["checkpoint.interval"]}
                onChange={(e) => handleChange("checkpoint.interval", e.target.value)}
              />
            </div>

            <div className="env-config-item">
              <label>Checkpoint Timeout (ms):</label>
              <input
                type="number"
                min="0"
                value={config["checkpoint.timeout"]}
                onChange={(e) => handleChange("checkpoint.timeout", e.target.value)}
              />
            </div>

            <div className="env-config-item">
              <label>Rows/Second Limit:</label>
              <input
                type="number"
                min="0"
                value={config["read_limit.rows_per_second"]}
                onChange={(e) => handleChange("read_limit.rows_per_second", e.target.value)}
              />
            </div>

            <div className="env-config-item">
              <label>Bytes/Second Limit:</label>
              <input
                type="number"
                min="0"
                value={config["read_limit.bytes_per_second"]}
                onChange={(e) => handleChange("read_limit.bytes_per_second", e.target.value)}
              />
            </div>
          </div>
          
          <div className="dynamic-fields">
            <h4>Additional Configuration:</h4>
            {newFields.map((field, index) => (
              <div key={index} className="config-field-row">
                <input
                  type="text"
                  placeholder="Field name"
                  value={field.key}
                  onChange={(e) => handleFieldChange(index, 'key', e.target.value)}
                  required
                />
                <select
                  value={field.valueType}
                  onChange={(e) => handleFieldChange(index, 'valueType', e.target.value)}
                  required
                  style={{ width: '120px' }}
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="array">Array</option>
                  <option value="object">Object</option>
                </select>
                {field.valueType === 'boolean' ? (
                  <select
                    value={field.value}
                    onChange={(e) => handleFieldChange(index, 'value', e.target.value === 'true')}
                    required
                    style={{ width: '120px' }}
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Value"
                    value={field.value}
                    onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveField(index)}
                  className="remove-field"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddField}
              className="add-field"
            >
              Add Configuration Field
            </button>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleReset}
              className="env-config-btn"
            >
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={onClose}
              className="env-config-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="save-config-btn"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnvConfigPanel;
