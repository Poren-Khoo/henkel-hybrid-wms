// src/hooks/useMQTTAction.js
// Error handling utility for MQTT actions with timeout support

import { useState, useCallback, useRef, useEffect } from 'react';
import { useGlobalUNS } from '../context/UNSContext';

/**
 * Custom error class for MQTT action errors
 */
export class MQTTActionError extends Error {
  constructor(message, code = 'MQTT_ERROR') {
    super(message);
    this.name = 'MQTTActionError';
    this.code = code;
  }
}

/**
 * Error codes for MQTT actions
 */
export const MQTT_ERROR_CODES = {
  TIMEOUT: 'MQTT_TIMEOUT',
  DISCONNECTED: 'MQTT_DISCONNECTED',
  VALIDATION: 'MQTT_VALIDATION',
  PUBLISH_FAILED: 'MQTT_PUBLISH_FAILED',
};

/**
 * Default timeout for MQTT actions (5 seconds)
 */
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Hook for executing MQTT actions with error handling and timeout
 * 
 * @param {Object} options - Hook options
 * @param {string} options.actionTopic - Topic to publish action to
 * @param {string} options.stateTopic - Topic to watch for state updates (optional)
 * @param {number} options.timeoutMs - Timeout in milliseconds (default: 5000)
 * @param {Function} options.onSuccess - Callback on success
 * @param {Function} options.onError - Callback on error
 * 
 * @returns {Object} - { execute, isLoading, error, clearError }
 * 
 * @example
 * const { execute, isLoading, error } = useMQTTAction({
 *   actionTopic: 'Henkelv2/Shanghai/Logistics/Outbound/Action/Create_Order',
 *   stateTopic: 'Henkelv2/Shanghai/Logistics/Costing/State/DN_Workflow_DB',
 *   onSuccess: () => navigate('/outbound'),
 *   onError: (err) => console.error(err),
 * });
 * 
 * // In handler:
 * execute(payload);
 */
export function useMQTTAction({
  actionTopic,
  stateTopic = null,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onSuccess = null,
  onError = null,
} = {}) {
  const { data, publish, status } = useGlobalUNS();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs for cleanup
  const timeoutRef = useRef(null);
  const previousStateRef = useRef(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Watch for state changes (if stateTopic provided)
  useEffect(() => {
    if (!stateTopic || !isLoading) return;
    
    const currentState = data.raw?.[stateTopic];
    
    // Check if state has changed (simple reference check)
    // In production, you might want a deep comparison or check specific fields
    if (previousStateRef.current !== null && currentState !== previousStateRef.current) {
      // State updated - action succeeded
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (isMountedRef.current) {
        setIsLoading(false);
        setError(null);
        
        if (onSuccess) {
          onSuccess(currentState);
        }
      }
    }
  }, [data.raw, stateTopic, isLoading, onSuccess]);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Execute the MQTT action with timeout handling
   * @param {Object} payload - The payload to publish
   * @param {Object} options - Override options for this execution
   * @returns {Promise<boolean>} - True if publish succeeded (not confirmed)
   */
  const execute = useCallback(async (payload, options = {}) => {
    const {
      topic = actionTopic,
      timeout = timeoutMs,
      skipTimeout = false,
    } = options;

    // Check connection status
    if (status !== 'CONNECTED') {
      const err = new MQTTActionError(
        'MQTT is disconnected. Please wait for reconnection.',
        MQTT_ERROR_CODES.DISCONNECTED
      );
      setError(err);
      if (onError) onError(err);
      return false;
    }

    // Clear previous error
    setError(null);
    setIsLoading(true);

    // Store current state for comparison
    if (stateTopic) {
      previousStateRef.current = data.raw?.[stateTopic];
    }

    try {
      // Publish the action
      publish(topic, payload);
      console.log(`📤 Action published to ${topic}`, payload);

      // If no state topic to watch, or skipTimeout, resolve immediately
      if (!stateTopic || skipTimeout) {
        // Give a small delay for "optimistic" success
        setTimeout(() => {
          if (isMountedRef.current) {
            setIsLoading(false);
            if (onSuccess) onSuccess(null);
          }
        }, 500);
        return true;
      }

      // Set timeout for state update
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          const err = new MQTTActionError(
            'Action timed out. The backend may not have processed your request. Please refresh and check.',
            MQTT_ERROR_CODES.TIMEOUT
          );
          setIsLoading(false);
          setError(err);
          if (onError) onError(err);
        }
      }, timeout);

      return true;
    } catch (e) {
      const err = new MQTTActionError(
        `Failed to publish action: ${e.message}`,
        MQTT_ERROR_CODES.PUBLISH_FAILED
      );
      setIsLoading(false);
      setError(err);
      if (onError) onError(err);
      return false;
    }
  }, [actionTopic, stateTopic, timeoutMs, status, data.raw, publish, onSuccess, onError]);

  return {
    execute,
    isLoading,
    error,
    clearError,
    isConnected: status === 'CONNECTED',
  };
}

/**
 * Simple utility to wrap any async action with loading/error states
 * (For non-MQTT async operations like validation)
 * 
 * @example
 * const { run, isLoading, error } = useAsyncAction();
 * 
 * const handleSubmit = () => {
 *   run(async () => {
 *     const errors = validator.validate(data);
 *     if (errors) throw new Error(errors[0]);
 *     await someAsyncThing();
 *   });
 * };
 */
export function useAsyncAction() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (asyncFn) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await asyncFn();
      setIsLoading(false);
      return result;
    } catch (e) {
      setIsLoading(false);
      setError(e);
      throw e;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { run, isLoading, error, clearError };
}

export default useMQTTAction;
