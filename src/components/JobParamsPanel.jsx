import React from 'react';

function JobParamsPanel({ queryParams, handleQueryParamChange }) {
  return (
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
  );
}

export default JobParamsPanel;