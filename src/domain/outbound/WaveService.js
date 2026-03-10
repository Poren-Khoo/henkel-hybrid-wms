// src/domain/outbound/WaveService.js
import { OutboundOrderValidationError } from './OutboundOrderValidator'

/**
 * Wave Service - Manages wave planning for Trading/DC orders
 * Waves group multiple orders for efficient batch picking
 */
export class WaveService {
    // ===========================================
    // WAVE STATUS DEFINITIONS
    // ===========================================

    static WAVE_STATUSES = ['PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

    static VALID_TRANSITIONS = {
        'PLANNED': ['RELEASED', 'CANCELLED'],
        'RELEASED': ['IN_PROGRESS', 'PLANNED', 'CANCELLED'],
        'IN_PROGRESS': ['COMPLETED'],
        'COMPLETED': [],
        'CANCELLED': []
    };

    // ===========================================
    // PICK METHODS
    // ===========================================

    static PICK_METHODS = {
        'DISCRETE': {
            label: 'Discrete Picking',
            description: 'One order at a time, simple but less efficient',
            minOrders: 1,
            maxOrders: 50
        },
        'BATCH': {
            label: 'Batch Picking',
            description: 'Pick multiple orders in one trip, sort at staging',
            minOrders: 5,
            maxOrders: 30
        },
        'ZONE': {
            label: 'Zone Picking',
            description: 'Pickers assigned to zones, items consolidated after',
            minOrders: 10,
            maxOrders: 100
        }
    };

    // ===========================================
    // STATUS HELPERS
    // ===========================================

    static isPlanned(status) {
        return (status || '').toUpperCase() === 'PLANNED';
    }

    static isReleased(status) {
        return (status || '').toUpperCase() === 'RELEASED';
    }

    static isInProgress(status) {
        return (status || '').toUpperCase() === 'IN_PROGRESS';
    }

    static isCompleted(status) {
        return (status || '').toUpperCase() === 'COMPLETED';
    }

    static isCancelled(status) {
        return (status || '').toUpperCase() === 'CANCELLED';
    }

    static canModify(status) {
        const statusUpper = (status || '').toUpperCase();
        return statusUpper === 'PLANNED';
    }

    static canRelease(status) {
        const statusUpper = (status || '').toUpperCase();
        return statusUpper === 'PLANNED';
    }

    // ===========================================
    // WAVE NORMALIZATION
    // ===========================================

    /**
     * Normalize raw wave data from MQTT
     * @param {Object} rawData - Raw wave data
     * @returns {Object} Normalized wave object
     */
    static normalizeWave(rawData) {
        if (!rawData || typeof rawData !== 'object') {
            return null;
        }

        return {
            wave_id: rawData.wave_id || rawData.id || 'UNKNOWN',
            status: rawData.status || 'PLANNED',

            // Grouping criteria
            ship_date: rawData.ship_date || rawData.shipDate || null,
            carrier: rawData.carrier || null,
            route: rawData.route || null,

            // Pick configuration
            pick_method: rawData.pick_method || rawData.pickMethod || 'BATCH',

            // Metrics
            delivery_count: rawData.delivery_count || rawData.deliveryCount || 0,
            line_count: rawData.line_count || rawData.lineCount || 0,
            picks_completed: rawData.picks_completed || rawData.picksCompleted || 0,
            picks_total: rawData.picks_total || rawData.picksTotal || 0,

            // Timestamps
            created_at: rawData.created_at || rawData.createdAt || null,
            released_at: rawData.released_at || rawData.releasedAt || null,
            completed_at: rawData.completed_at || rawData.completedAt || null,

            // Delivery IDs in this wave
            delivery_ids: rawData.delivery_ids || rawData.deliveryIds || [],

            raw: rawData
        };
    }

    // ===========================================
    // WAVE COMMANDS
    // ===========================================

    /**
     * Build MQTT command payload for creating a new wave
     * @param {Object} waveData - Wave configuration
     * @returns {Object} MQTT payload
     */
    static buildCreateWaveCommand(waveData) {
        if (!waveData) {
            throw new OutboundOrderValidationError("Wave data is required");
        }

        return {
            wave_id: 'WAVE-' + Date.now(),
            status: 'PLANNED',
            ship_date: waveData.shipDate || null,
            carrier: waveData.carrier || null,
            route: waveData.route || null,
            pick_method: waveData.pickMethod || 'BATCH',
            delivery_ids: waveData.deliveryIds || [],
            created_at: Date.now(),
            action: 'CREATE_WAVE'
        };
    }

    /**
     * Build MQTT command payload for releasing a wave
     * @param {string} waveId - Wave ID
     * @param {string} currentStatus - Current wave status (for validation)
     * @returns {Object} MQTT payload
     */
    static buildReleaseWaveCommand(waveId, currentStatus) {
        if (!waveId || waveId.trim().length === 0) {
            throw new OutboundOrderValidationError("Wave ID is required");
        }

        if (!WaveService.canRelease(currentStatus)) {
            throw new OutboundOrderValidationError(
                `Cannot release wave in status: ${currentStatus}. Only PLANNED waves can be released.`
            );
        }

        return {
            wave_id: waveId,
            action: 'RELEASE_WAVE',
            released_at: Date.now(),
            timestamp: Date.now()
        };
    }

    /**
     * Build MQTT command payload for cancelling a wave
     * @param {string} waveId - Wave ID
     * @param {string} reason - Cancellation reason
     * @returns {Object} MQTT payload
     */
    static buildCancelWaveCommand(waveId, reason) {
        if (!waveId || waveId.trim().length === 0) {
            throw new OutboundOrderValidationError("Wave ID is required");
        }

        return {
            wave_id: waveId,
            action: 'CANCEL_WAVE',
            reason: reason || 'Cancelled by user',
            timestamp: Date.now()
        };
    }

    /**
     * Build MQTT command payload for updating wave pick method
     * @param {string} waveId - Wave ID
     * @param {string} pickMethod - New pick method
     * @returns {Object} MQTT payload
     */
    static buildUpdatePickMethodCommand(waveId, pickMethod) {
        if (!waveId || waveId.trim().length === 0) {
            throw new OutboundOrderValidationError("Wave ID is required");
        }

        if (!WaveService.PICK_METHODS[pickMethod]) {
            throw new OutboundOrderValidationError(
                `Invalid pick method: ${pickMethod}. Valid methods: ${Object.keys(WaveService.PICK_METHODS).join(', ')}`
            );
        }

        return {
            wave_id: waveId,
            action: 'UPDATE_PICK_METHOD',
            pick_method: pickMethod,
            timestamp: Date.now()
        };
    }

    // ===========================================
    // WAVE FILTERING
    // ===========================================

    /**
     * Filter waves by status
     * @param {Array} waves - Array of waves
     * @param {string} status - Status to filter by
     * @returns {Array} Filtered waves
     */
    static filterByStatus(waves, status) {
        if (!status || status === 'all') {
            return waves;
        }
        return waves.filter(w => (w.status || '').toUpperCase() === status.toUpperCase());
    }

    /**
     * Get waves that have open orders (not all picked)
     * @param {Array} waves - Array of waves
     * @returns {Array} Waves with open work
     */
    static getOpenWaves(waves) {
        return waves.filter(w =>
            WaveService.isReleased(w.status) || WaveService.isInProgress(w.status)
        );
    }

    // ===========================================
    // WAVE PROGRESS
    // ===========================================

    /**
     * Calculate wave completion percentage
     * @param {Object} wave - Wave object
     * @returns {number} Completion percentage (0-100)
     */
    static calculateProgress(wave) {
        if (!wave || wave.picks_total === 0) {
            return 0;
        }
        return Math.round((wave.picks_completed / wave.picks_total) * 100);
    }

    /**
     * Get wave status badge configuration
     * @param {string} status - Wave status
     * @returns {Object} Badge config
     */
    static getStatusBadgeConfig(status) {
        const statusUpper = (status || '').toUpperCase();

        if (statusUpper === 'PLANNED') {
            return {
                className: 'bg-gray-100 text-gray-700 border-gray-200',
                label: 'Planned',
                variant: 'default'
            };
        }
        if (statusUpper === 'RELEASED') {
            return {
                className: 'bg-blue-100 text-blue-700 border-blue-200',
                label: 'Released',
                variant: 'default'
            };
        }
        if (statusUpper === 'IN_PROGRESS') {
            return {
                className: 'bg-orange-100 text-orange-700 border-orange-200',
                label: 'In Progress',
                variant: 'default'
            };
        }
        if (statusUpper === 'COMPLETED') {
            return {
                className: 'bg-green-100 text-green-700 border-green-200',
                label: 'Completed',
                variant: 'default'
            };
        }
        if (statusUpper === 'CANCELLED') {
            return {
                className: 'bg-red-100 text-red-700 border-red-200',
                label: 'Cancelled',
                variant: 'default'
            };
        }

        return {
            className: 'bg-gray-50 text-gray-500 border-gray-200',
            label: status,
            variant: 'outline'
        };
    }

    // ===========================================
    // AUTO-WAVE SUGGESTIONS
    // ===========================================

    /**
     * Suggest wave groupings based on orders
     * Groups by ship date + carrier + route
     * @param {Array} orders - Array of released orders
     * @returns {Array} Array of suggested wave groups
     */
    static suggestWaveGroups(orders) {
        const groups = new Map();

        orders.forEach(order => {
            // Skip if not in RELEASED status
            if ((order.status || '').toUpperCase() !== 'RELEASED') {
                return;
            }

            // Create grouping key
            const key = [
                order.requested_date || 'no-date',
                order.carrier || 'no-carrier',
                order.route || 'no-route'
            ].join('|');

            if (!groups.has(key)) {
                groups.set(key, {
                    ship_date: order.requested_date || null,
                    carrier: order.carrier || null,
                    route: order.route || null,
                    orders: []
                });
            }

            groups.get(key).orders.push(order);
        });

        // Convert to array and sort by order count (largest first)
        return Array.from(groups.values())
            .filter(g => g.orders.length > 0)
            .sort((a, b) => b.orders.length - a.orders.length);
    }
}
