import React, { useState } from 'react';

export const defaultEnvConfig = {
  "job.mode": "BATCH",
  "parallelism": 1,
  "job.retry.times": 3,
  "job.retry.interval.seconds": 3,
  "checkpoint.interval": 30000,
  "checkpoint.timeout": 30000,  
  "read_limit.rows_per_second": 400,
  "read_limit.bytes_per_second": 7000000
};

const EnvConfigPanel = ({ envConfig, setEnvConfig, onClose }) => {
  const [config, setConfig] = useState(envConfig);

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
    setEnvConfig(cleanedConfig);
    onClose();
  };

  const handleReset = () => {
    setConfig(defaultEnvConfig);
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
          
          <div className="form-actions">
            <button type="button" onClick={handleReset} className="reset-btn">
              Reset Defaults
            </button>
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnvConfigPanel;
