import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Ditulis ulang dari versi shadcn (useEffect + setState) yang ditolak aturan
// `react-hooks/set-state-in-effect`. useSyncExternalStore membaca matchMedia
// langsung; nilai di server false eksplisit, bukan undefined.
const mql = () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

function subscribe(onChange: () => void) {
  const m = mql()
  m.addEventListener("change", onChange)
  return () => m.removeEventListener("change", onChange)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => mql().matches,
    () => false
  )
}
