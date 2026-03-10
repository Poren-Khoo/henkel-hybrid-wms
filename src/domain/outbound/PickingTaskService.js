// src/domain/outbound/PickingTaskService.js
import { PickingTaskValidator } from './PickingTaskValidator'

export class PickingTaskService {
  /**
   * Normalize raw MQTT task data to consistent structure
   * Handles various field name variations from backend
   * @param {Object} rawData - Raw task data from MQTT topic
   * @returns {Object} Normalized task object
   */
  static normalizeTask(rawData) {
    if (!rawData || typeof rawData !== 'object') {
      return null
    }

    // Handle different ID field variations
    const id = rawData.task_id || rawData.id || 'UNKNOWN'
    
    // Handle order ID variations
    const orderId = rawData.order_id || rawData.ref_no || rawData.order_ref || ''
    
    // Handle order type
    const type = rawData.order_type || rawData.type || 'SALES_ORDER'
    
    // Handle SKU/material variations
    const sku = rawData.sku || rawData.material || rawData.item_code || 'UNKNOWN'
    
    // Handle description
    const desc = rawData.desc || rawData.description || rawData.item_desc || 'Standard Material'
    
    // Handle location/bin variations
    const location = rawData.location || rawData.bin || rawData.storage_location || 'ZONE-A-01'
    
    // Extract zone from location using validator helper
    const zone = PickingTaskValidator.extractZone(location)
    
    // Handle quantity variations
    const qty = Number(rawData.qty_req || rawData.qty || rawData.quantity || 0)
    
    // Handle UOM
    const uom = rawData.uom || rawData.unit || rawData.unit_of_measure || 'EA'
    
    // Handle destination
    const destination = rawData.destination || rawData.dest || rawData.pack_station || 'PACK-STATION-1'
    
    // Handle status
    const status = (rawData.status || 'PENDING').toUpperCase()

    return {
      id,
      orderId,
      type,
      sku,
      desc,
      location,
      zone,
      qty,
      uom,
      destination,
      status,
      raw: rawData // Preserve raw data for debugging
    }
  }

  /**
   * Normalize array of tasks with UNS envelope unwrapping
   * @param {Object|Array} rawData - Raw data from MQTT topic (may be wrapped in UNS envelope)
   * @returns {Array} Array of normalized task objects
   */
  static normalizeTasks(rawData) {
    if (!rawData) return []

    // Unwrap UNS envelope if present
    let queueData = rawData
    if (rawData?.topics && Array.isArray(rawData.topics) && rawData.topics.length > 0) {
      queueData = rawData.topics[0].value || rawData.topics[0]
    }

    // Handle different data structures
    let taskArray = []
    if (Array.isArray(queueData)) {
      taskArray = queueData
    } else if (queueData?.queue && Array.isArray(queueData.queue)) {
      taskArray = queueData.queue
    } else if (queueData?.items && Array.isArray(queueData.items)) {
      taskArray = queueData.items
    } else if (queueData?.tasks && Array.isArray(queueData.tasks)) {
      taskArray = queueData.tasks
    } else if (typeof queueData === 'object') {
      // Single task object
      taskArray = [queueData]
    }

    // Normalize each task
    return taskArray
      .map(task => this.normalizeTask(task))
      .filter(task => task !== null)
  }

  /**
   * Filter tasks by zone
   * @param {Array} tasks - Array of normalized task objects
   * @param {string} zone - Zone to filter by ('ALL' or specific zone like 'A', 'B', 'Q')
   * @returns {Array} Filtered tasks
   */
  static filterTasksByZone(tasks, zone) {
    if (!Array.isArray(tasks)) return []
    if (zone === 'ALL' || !zone) return tasks
    
    return tasks.filter(task => task.zone === zone)
  }

  /**
   * Filter tasks by status
   * @param {Array} tasks - Array of normalized task objects
   * @param {string} status - Status to filter by (default: 'PENDING')
   * @returns {Array} Filtered tasks
   */
  static filterTasksByStatus(tasks, status = 'PENDING') {
    if (!Array.isArray(tasks)) return []
    if (!status) return tasks
    
    const statusUpper = status.toUpperCase()
    return tasks.filter(task => task.status === statusUpper)
  }

  /**
   * Build confirm pick command payload
   * @param {Object} task - Normalized task object
   * @param {string} scanBin - Scanned bin/location
   * @param {string} scanItem - Scanned item/SKU
   * @param {number|string} scanQty - Quantity picked
   * @param {string} operator - Operator name/ID
   * @returns {Object} Command payload
   */
  static buildConfirmPickCommand(task, scanBin, scanItem, scanQty, operator) {
    if (!task || !task.id) {
      throw new Error('Task is required to build confirm pick command')
    }

    return {
      task_id: task.id,
      order_id: task.orderId,
      sku: task.sku,
      qty_picked: Number(scanQty) || 0,
      operator: operator || 'Current_User',
      timestamp: Date.now()
    }
  }

  /**
   * Build exception/short pick command payload
   * @param {Object} task - Normalized task object
   * @param {string} reason - Exception reason code
   * @param {string} operator - Operator name/ID
   * @param {string} notes - Optional notes
   * @returns {Object} Command payload
   */
  static buildExceptionCommand(task, reason, operator, notes = '') {
    if (!task || !task.id) {
      throw new Error('Task is required to build exception command')
    }

    return {
      task_id: task.id,
      sku: task.sku,
      location: task.location,
      reason: reason || 'UNKNOWN',
      operator: operator || 'Current_User',
      timestamp: Date.now(),
      ...(notes && { notes })
    }
  }
}
