// src/domain/inbound/ExceptionService.js
import { ExceptionValidator } from './ExceptionValidator'

export class ExceptionService {
  /**
   * Normalize raw MQTT exception data to consistent structure
   * Handles various field name variations from backend
   */
  static normalizeException(rawException) {
    return {
      id: rawException.id || `EX-${Math.floor(Math.random() * 1000)}`,
      type: ExceptionValidator.validateExceptionType(rawException.type),
      severity: ExceptionValidator.validateSeverity(rawException.severity),
      sourceRef: rawException.source_ref || rawException.ref || 'N/A',
      reportedBy: rawException.reported_by || rawException.reportedBy || 'Operator',
      timestamp: rawException.timestamp || 'Just now',
      status: rawException.status || 'OPEN',
      details: rawException.details || rawException.description || ''
    };
  }

  /**
   * Calculate exception KPIs (business rules)
   * @param {Array} exceptions - List of normalized exceptions
   * @returns {Object} KPI data with critical count, open count, and today count
   */
  static calculateKPIs(exceptions) {
    return {
      critical: exceptions.filter(e => e.severity === 'CRITICAL').length,
      open: exceptions.length,
      today: 0 // TODO: Calculate based on timestamp if available
    };
  }

  /**
   * Build exception resolution command payload
   * @param {Object} resolutionData - Resolution data from component
   * @returns {Object} - Formatted MQTT payload
   */
  static buildResolutionCommand(resolutionData) {
    // Validate first
    ExceptionValidator.validateResolution(resolutionData);

    // Build MQTT command payload
    return {
      exception_id: resolutionData.exceptionId,
      action: resolutionData.action,
      note: resolutionData.note || '',
      resolver: resolutionData.resolver || "Supervisor_Account",
      timestamp: Date.now()
    };
  }
}
