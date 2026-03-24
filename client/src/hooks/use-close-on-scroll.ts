import * as React from "react"

const IGNORE_SCROLL_SELECTORS =
  "[data-radix-select-viewport], [data-radix-dropdown-menu-content], [role='listbox'], [role='menu']"

function shouldIgnoreClose(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest(IGNORE_SCROLL_SELECTORS)
}

export function useCloseOnScroll(isOpen: boolean, onClose: () => void) {
  const onCloseRef = React.useRef(onClose)

  React.useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  React.useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleCloseOnScroll = (event: Event) => {
      if (shouldIgnoreClose(event.target)) {
        return
      }
      onCloseRef.current()
    }

    document.addEventListener("wheel", handleCloseOnScroll, {
      passive: true,
      capture: true,
    })
    document.addEventListener("touchmove", handleCloseOnScroll, {
      passive: true,
      capture: true,
    })
    document.addEventListener("scroll", handleCloseOnScroll, {
      passive: true,
      capture: true,
    })

    return () => {
      document.removeEventListener("wheel", handleCloseOnScroll, true)
      document.removeEventListener("touchmove", handleCloseOnScroll, true)
      document.removeEventListener("scroll", handleCloseOnScroll, true)
    }
  }, [isOpen])
}