import { useGlobalUNS } from '../context/UNSContext'

export default function UNSConnectionInfo({ topic, lastUpdated }) {
  const { status } = useGlobalUNS()

  // Get status badge color
  const getStatusColor = () => {
    if (status === 'CONNECTED') return 'text-green-600'
    if (status === 'ERROR') return 'text-red-500'
    return 'text-amber-500'
  }

  // Format last updated timestamp
  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return null
    try {
      // Handle both Unix timestamp (seconds) and Date objects
      const date = typeof timestamp === 'number' 
        ? new Date(timestamp * 1000) 
        : new Date(timestamp)
      if (isNaN(date.getTime())) return null
      return date.toLocaleString()
    } catch (e) {
      return null
    }
  }

  const formattedDate = lastUpdated ? formatLastUpdated(lastUpdated) : null

  return (
    <div className="space-y-1">
      <p className="text-sm text-slate-500">
        Path: {topic}
      </p>
      <p className="text-xs mt-1">
        Status: <span className={getStatusColor()}>{status}</span>
      </p>
      {formattedDate && (
        <p className="text-xs text-slate-400 mt-1">
          Last Packet: {formattedDate}
        </p>
      )}
    </div>
  )
}

