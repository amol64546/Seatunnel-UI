import React, { useState, useEffect, useCallback } from 'react';

const ValueEditor = ({ value, onChange, disabled = false }) => {
  const getValueType = useCallback((val) => {
    if (Array.isArray(val)) return 'array';
    if (typeof val === 'object' && val !== null) return 'object';
    return typeof val; // 'string', 'number', 'boolean'
  }, []);

  const [type, setType] = useState(getValueType(value));
  const [inputValue, setInputValue] = useState('');
  const [isValid, setIsValid] = useState(true);

  // Initialize input value based on type
  useEffect(() => {
    if (type === 'array' || type === 'object') {
      try {
        setInputValue(JSON.stringify(value || (type === 'array' ? [] : {}), null, 2));
      } catch {
        setInputValue(type === 'array' ? '[]' : '{}');
      }
    } else if (type === 'boolean') {
      setInputValue(String(value ?? true));
    } else {
      setInputValue(value != null ? String(value) : '');
    }
    setIsValid(true);
  }, [value, type]);

  const handleTypeChange = (newType) => {
    setType(newType);
    // Set sensible defaults when type changes
    const defaults = {
      string: '',
      number: null,
      boolean: true,
      array: [],
      object: {}
    };
    onChange(defaults[newType]);
  };

  const handleValueChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    let parsedValue = val;
    let valid = true;

    try {
      if (type === 'number') {
        parsedValue = val === '' ? null : Number(val);
        valid = val === '' || !isNaN(parsedValue);  // Allow empty string
      } else if (type === 'boolean') {
        parsedValue = val === 'true';
      } else if (type === 'array' || type === 'object') {
        parsedValue = JSON.parse(val);
        valid = type === 'array' ? Array.isArray(parsedValue) : 
               typeof parsedValue === 'object' && !Array.isArray(parsedValue);
      }

      if (valid) {
        onChange(parsedValue);
        setIsValid(true);
      } else {
        setIsValid(false);
      }
    } catch (e) {
      setIsValid(false);
    }
  };

  const renderInput = () => {
    switch(type) {
      case 'boolean':
        return (
          <select
            value={inputValue}
            onChange={handleValueChange}
            disabled={disabled}
            className={`boolean-select ${!isValid ? 'invalid' : ''}`}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        );
      
      case 'array':
      case 'object':
        return (
          <textarea
            value={inputValue}
            onChange={handleValueChange}
            disabled={disabled}
            placeholder={`Enter valid ${type} as JSON`}
            className={`json-input ${!isValid ? 'invalid' : ''}`}
            rows={4}
          />
        );
      
      default:
        return (
          <input
            type={type === 'number' ? 'number' : 'text'}
            value={inputValue}
            onChange={handleValueChange}
            disabled={disabled}
            placeholder={`Enter ${type} value`}
            className={`value-input ${!isValid ? 'invalid' : ''}`}
          />
        );
    }
  };

  return (
    <div className={`value-editor ${disabled ? 'disabled' : ''}`}>
      <select 
        value={type} 
        onChange={(e) => handleTypeChange(e.target.value)}
        disabled={disabled}
        className="type-selector"
      >
        <option value="string">String</option>
        <option value="number">Number</option>
        <option value="boolean">Boolean</option>
        <option value="array">Array</option>
        <option value="object">Object</option>
      </select>

      {renderInput()}
      
      {!isValid && (
        <div className="validation-error">
          Invalid {type} value
        </div>
      )}
    </div>
  );
};

export default ValueEditor;