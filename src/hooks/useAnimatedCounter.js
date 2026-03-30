import { useState, useEffect, useRef } from 'react'

/**
 * Animates a number from its previous value to the target value.
 * Uses ease-out for natural deceleration.
 *
 * @param {number} target - The target number to animate to
 * @param {object} opts
 * @param {number} [opts.duration=600] - Animation duration in ms
 * @param {number} [opts.decimals=0] - Decimal places to preserve during animation
 * @returns {number} The current animated value
 */
export function useAnimatedCounter(target, { duration = 600, decimals = 0 } = {}) {
  const [display, setDisplay] = useState(target)
  const prev = useRef(target)
  const raf = useRef(null)

  useEffect(() => {
    const from = prev.current
    const to = target
    prev.current = target

    if (from === to) return

    const start = performance.now()
    const delta = to - from

    const tick = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      const value = from + delta * eased
      setDisplay(decimals > 0 ? parseFloat(value.toFixed(decimals)) : Math.round(value))

      if (progress < 1) {
        raf.current = requestAnimationFrame(tick)
      }
    }

    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, duration, decimals])

  return display
}
