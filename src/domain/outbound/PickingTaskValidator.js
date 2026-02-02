// src/domain/outbound/PickingTaskValidator.js

export class PickingTaskValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PickingTaskValidationError'
  }
}

export class PickingTaskValidator {
  // Valid exception reasons
  static VALID_EXCEPTION_REASONS = ['BIN_EMPTY', 'DAMAGED', 'WRONG_ITEM', 'BLOCKED']

  // Valid task statuses
  static VALID_TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXCEPTION']

  // Valid zones
  static VALID_ZONES = ['A', 'B', 'Q', 'ALL']

  // Exception reason display labels
  static EXCEPTION_REASON_LABELS = {
    'BIN_EMPTY': 'Bin Empty (Short Pick)',
    'DAMAGED': 'Item Damaged',
    'WRONG_ITEM': 'Wrong Item in Bin',
    'BLOCKED': 'Location Inaccessible'
  }

  /**
   * Extract zone from location string
   * Examples: "ZONE-A-01" → "A", "ZONE-B-05" → "B", "Q-CAGE-01" → "Q"
   * @param {string} location - Location string
   * @returns {string} Zone letter (A, B, Q) or 'A' as default
   */
  static extractZone(location) {
    if (!location || typeof location !== 'string') return 'A'

    // Try to extract zone from patterns like "ZONE-A-01", "ZONE-B-05", "Q-CAGE-01"
    const zoneMatch = location.match(/ZONE-([ABQ])-|([ABQ])-CAGE-|^([ABQ])-/i)
    if (zoneMatch) {
      return (zoneMatch[1] || zoneMatch[2] || zoneMatch[3]).toUpperCase()
    }

    // Default to 'A' if no pattern matches
    return 'A'
  }

  /**
   * Validate bin and item scans match task requirements
   * @param {Object} task - Normalized task object
   * @param {string} scanBin - Scanned bin/location
   * @param {string} scanItem - Scanned item/SKU
   * @throws {PickingTaskValidationError} If validation fails
   */
  static validateScan(task, scanBin, scanItem) {
    if (!task) {
      throw new PickingTaskValidationError('Task is required for scan validation')
    }

    if (!scanBin || !scanBin.trim()) {
      throw new PickingTaskValidationError('Bin location must be scanned')
    }

    if (!scanItem || !scanItem.trim()) {
      throw new PickingTaskValidationError('Item SKU must be scanned')
    }

    // Validate bin matches task location (case-insensitive)
    if (scanBin.trim().toUpperCase() !== task.location.toUpperCase()) {
      throw new PickingTaskValidationError(`Wrong Bin Scanned! Expected: ${task.location}, Got: ${scanBin}`)
    }

    // Validate item matches task SKU (case-insensitive)
    if (scanItem.trim().toUpperCase() !== task.sku.toUpperCase()) {
      throw new PickingTaskValidationError(`Wrong Item Scanned! Expected: ${task.sku}, Got: ${scanItem}`)
    }
  }

  /**
   * Validate exception reason is in valid list
   * @param {string} reason - Exception reason code
   * @throws {PickingTaskValidationError} If reason is invalid
   */
  static validateExceptionReason(reason) {
    if (!reason || !reason.trim()) {
      throw new PickingTaskValidationError('Exception reason is required')
    }

    if (!this.VALID_EXCEPTION_REASONS.includes(reason)) {
      throw new PickingTaskValidationError(
        `Invalid exception reason: ${reason}. Valid reasons: ${this.VALID_EXCEPTION_REASONS.join(', ')}`
      )
    }
  }

  /**
   * Validate picked quantity doesn't exceed required quantity
   * @param {number|string} qty - Picked quantity
   * @param {number} maxQty - Maximum allowed quantity (task required qty)
   * @throws {PickingTaskValidationError} If quantity is invalid
   */
  static validatePickQuantity(qty, maxQty) {
    const pickedQty = Number(qty)
    const max = Number(maxQty)

    if (isNaN(pickedQty) || pickedQty <= 0) {
      throw new PickingTaskValidationError('Picked quantity must be a positive number')
    }

    if (pickedQty > max) {
      throw new PickingTaskValidationError(
        `Picked quantity (${pickedQty}) cannot exceed required quantity (${max})`
      )
    }
  }

  /**
   * Validate zone is valid
   * @param {string} zone - Zone to validate
   * @returns {boolean} True if valid
   */
  static isValidZone(zone) {
    return this.VALID_ZONES.includes(zone?.toUpperCase())
  }

  /**
   * Get display label for exception reason
   * @param {string} reason - Exception reason code
   * @returns {string} Display label
   */
  static getExceptionReasonLabel(reason) {
    return this.EXCEPTION_REASON_LABELS[reason] || reason
  }
}
