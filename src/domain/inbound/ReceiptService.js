// src/domain/inbound/ReceiptService.js
import { ReceiptValidator } from './ReceiptValidator'
import { InboundOrderValidator } from './InboundOrderValidator'

export class ReceiptService {
  /**
   * Check for over-receipt (business rule: 10% tolerance)
   * @param {number} received - Total quantity received
   * @param {number} expected - Total quantity expected
   * @param {number} tolerance - Tolerance percentage (default 0.1 = 10%)
   * @returns {Object|null} - Warning object if over tolerance, null otherwise
   */
  static checkOverReceipt(received, expected, tolerance = 0.1) {
    if (expected > 0 && received > expected * (1 + tolerance)) {
      return {
        received: received,
        expected: expected,
        diff: ((received - expected) / expected * 100).toFixed(1)
      };
    }
    return null;
  }

  /**
   * Check for over-receipt by calculating totals from receipt lines and selected document
   * This encapsulates the business logic for calculating totals and checking tolerance
   * @param {Array} lines - Receipt line items
   * @param {Object} selectedDoc - Selected inbound order document
   * @param {number} tolerance - Tolerance percentage (default 0.1 = 10%)
   * @returns {Object|null} - Warning object if over tolerance, null otherwise
   */
  static checkOverReceiptForReceipt(lines, selectedDoc, tolerance = 0.1) {
    const totalReceived = lines.reduce((sum, l) => sum + Number(l.qty), 0);
    const expected = selectedDoc.lines.reduce((sum, l) => 
      sum + (Number(l.qty) || Number(l.qty_expected) || 0), 0
    );
    return ReceiptService.checkOverReceipt(totalReceived, expected, tolerance);
  }

  /**
   * Build MQTT receipt command payload
   * @param {Object} receiptData - Receipt data from component
   * @returns {Object} - Formatted MQTT payload
   */
  static buildReceiptCommand(receiptData) {
    // Validate first
    ReceiptValidator.validateCreate(receiptData);

    const isMfg = InboundOrderValidator.isManufacturing(receiptData.orderType);

    // Build polymorphic context (aligned with LotReceivingModal)
    const context = isMfg
      ? {
          line: receiptData.headerData.prodLine,
          shift: receiptData.headerData.shift
        }
      : {
          dock: receiptData.headerData.dock || 'DOCK-IN-01',
          vehicleLicense: receiptData.headerData.vehicleLicense || ''
        };

    // Build MQTT command payload (identical structure to LotReceivingModal)
    return {
      doc_id: receiptData.docId || receiptData.headerData.dnNumber,
      type: receiptData.orderType || 'MANUAL',
      context: context,
      lines: receiptData.lines.map(l => ({
        code: l.code,
        desc: l.desc || '',
        batch: l.batch || '',
        mfgDate: l.mfgDate || '',
        expiry: l.expiry || '',
        qty: Number(l.qty),
        uom: l.uom || 'KG',
        containerId: l.containerId || '',
        stagingLocation: l.stagingLocation || 'RCV-01',
        receiver: l.receiver || receiptData.operator || ''
      })),
      outcome: receiptData.outcome,
      inspection: receiptData.inspection || { packagingOk: true, noLeaks: true, notes: '' },
      operator: receiptData.operator || "CurrentUser",
      timestamp: Date.now()
    };
  }
}
