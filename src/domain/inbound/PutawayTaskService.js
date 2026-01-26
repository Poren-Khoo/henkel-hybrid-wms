// src/domain/inbound/PutawayTaskService.js
import { PutawayTaskValidator } from './PutawayTaskValidator'

export class PutawayTaskService {
  /**
   * Normalize raw MQTT task data to consistent structure
   * Handles various field name variations from backend
   */
  static normalizeTask(rawTask) {
    return {
      id: rawTask.task_id || rawTask.id || rawTask.taskId || `TSK-${Math.random().toString(36).substr(2, 9)}`,
      hu: rawTask.hu || rawTask.handling_unit || rawTask.handlingUnit || rawTask.hu_id || 'N/A',
      material: rawTask.material || rawTask.material_code || rawTask.materialCode || rawTask.sku || 'N/A',
      desc: rawTask.desc || rawTask.description || rawTask.material_name || rawTask.materialName || '',
      qty: rawTask.qty || rawTask.quantity || rawTask.qty_required || rawTask.qtyRequired || '0',
      status: rawTask.status || rawTask.task_status || rawTask.taskStatus || 'AVAILABLE',
      type: PutawayTaskValidator.validateTaskType(rawTask.type || rawTask.task_type || rawTask.taskType),
      source: rawTask.source || rawTask.source_location || rawTask.sourceLocation || rawTask.from_location || rawTask.fromLocation || 'UNKNOWN',
      hazmat: rawTask.hazmat || rawTask.is_hazmat || rawTask.isHazmat || false,
      temp: rawTask.temp || rawTask.temperature || rawTask.temp_requirement || rawTask.tempRequirement || 'Ambient',
      aging: rawTask.aging || rawTask.age || rawTask.time_elapsed || rawTask.timeElapsed || '0m',
      strategy: rawTask.strategy || rawTask.putaway_strategy || rawTask.putawayStrategy || 'DEFAULT',
      suggestionStatus: rawTask.suggestionStatus || rawTask.suggestion_status || 'SUGGESTED',
      topBin: rawTask.topBin || rawTask.top_bin || rawTask.suggested_bin || rawTask.suggestedBin || '—',
      batch: rawTask.batch || rawTask.batch_id || rawTask.batchId || '',
    };
  }

  /**
   * Filter tasks based on context (putaway vs internal moves)
   * Business rule: Putaway shows tasks from DOCKS (commercial) OR LINES (manufacturing) OR type PUTAWAY
   * Note: Filtering is by source location, not warehouse type attribute
   */
  static filterTasksByContext(tasks, isPutawayMode) {
    return tasks.filter(task => {
      if (isPutawayMode) {
        // PUTAWAY MODE: Show tasks from DOCKS (commercial) OR LINES (manufacturing) OR type PUTAWAY
        return (
          task.type === 'PUTAWAY' || 
          task.source.includes('DOCK') || 
          task.source.includes('LINE')
        );
      } else {
        // INTERNAL MOVES MODE: Exclude PUTAWAY tasks
        return task.type !== 'PUTAWAY';
      }
    });
  }

  /**
   * Build putaway confirmation command payload
   */
  static buildConfirmationCommand(confirmationData) {
    // Validate first
    PutawayTaskValidator.validateConfirmation(
      {
        scanHu: confirmationData.scanHu,
        scanBin: confirmationData.scanBin,
        confirmedTarget: confirmationData.confirmedTarget
      },
      confirmationData.task
    );

    // Build MQTT command payload
    return {
      task_id: confirmationData.task.id,
      hu: confirmationData.scanHu,
      target_bin: confirmationData.confirmedTarget?.bin || confirmationData.scanBin,
      operator: confirmationData.operator || "Current_User",
      timestamp: Date.now()
    };
  }

  /**
   * Build exception report command payload
   */
  static buildExceptionCommand(exceptionData) {
    // Validate first
    PutawayTaskValidator.validateExceptionReport({
      reason: exceptionData.reason
    });

    // Build MQTT command payload
    return {
      reason: exceptionData.reason,
      notes: exceptionData.notes || "Exception raised from Putaway Task",
      operator: exceptionData.operator || "Current_User",
      task_id: exceptionData.task?.id,
      hu: exceptionData.task?.hu,
      timestamp: Date.now()
    };
  }
}