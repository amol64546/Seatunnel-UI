import { useCallback } from 'react';

export function usePipelineSubmission(nodes, edges, envConfig, queryParams, validatePipeline, setNodes) {
  const submitPipeline = useCallback(async () => {
    const validation = validatePipeline();
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    let outputCounter = 1;
    let inputCounter = 1;
    const outputMap = {};
    const inputMap = {};

    nodes.forEach(node => {
      if (node.type === 'source' || node.type === 'transform') {
        outputMap[node.id] = `output_${outputCounter++}`;
      }
    });

    nodes.forEach(node => {
      if (node.type === 'transform' || node.type === 'sink') {
        inputMap[node.id] = `input_${inputCounter++}`;
      }
    });

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
          plugin_output: inputMap[node.id]
        };
      }),
      sink: nodes.filter(n => n.type === 'sink').map(node => {
        const inputs = edges
          .filter(edge => edge.target === node.id)
          .map(edge =>
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
  }, [nodes, edges, envConfig, queryParams, validatePipeline, setNodes]);

  return { submitPipeline };
}
