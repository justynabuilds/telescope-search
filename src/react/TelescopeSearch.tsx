import { useEffect, useRef, type CSSProperties } from "react"
import "../element/index.ts"
import type { TelescopeSearchElement, TelescopeSelectDetail, TelescopeSearchDetail } from "../element/index.ts"

export interface TelescopeSearchItem {
  label: string
  href?: string
  /** Shown under the label. */
  description?: string
  /** Extra words that should find this page but aren't shown. */
  keywords?: string
  target?: string
}

export interface TelescopeSearchProps {
  items: TelescopeSearchItem[]
  /** Text on the closed field. Default "Search". */
  label?: string
  /** Placeholder once it opens. Default "Search pages". */
  placeholder?: string
  /** Key hint on the closed field. Default "/". An empty string hides it. */
  hint?: string
  /** "/" and Cmd/Ctrl+K open it. Default true. */
  shortcut?: boolean
  /** Controlled open state. Leave out to let the search manage itself. */
  open?: boolean
  /** "left" (default) pulls out to the left, for a field on the right of the nav. */
  side?: "left" | "right"
  /** Open length in px. Default 420; shortens itself when the screen is too narrow. */
  length?: number
  maxResults?: number
  /** "{n} page|{n} pages|none" */
  countText?: string
  /** Shown when nothing matches; {q} is the query. */
  emptyText?: string
  emptyHint?: string
  /** A short click when a tube hits its stop. Default true. */
  sound?: boolean
  /** A tiny vibration on touch devices when a tube hits its stop. Default true. */
  haptics?: boolean
  /** Return false (or call preventDefault on the event) to stop the link from navigating. */
  onSelect?: (detail: TelescopeSelectDetail, event: CustomEvent<TelescopeSelectDetail>) => void | boolean
  onOpenChange?: (open: boolean) => void
  onSearch?: (detail: TelescopeSearchDetail) => void
  className?: string
  style?: CSSProperties
}

const off = (v: boolean | undefined) => (v === false ? "off" : undefined)

export function TelescopeSearch(props: TelescopeSearchProps) {
  const ref = useRef<TelescopeSearchElement>(null)
  const handlers = useRef(props)
  handlers.current = props

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onSelect = (e: Event) => {
      const ev = e as CustomEvent<TelescopeSelectDetail>
      if (handlers.current.onSelect?.(ev.detail, ev) === false) ev.preventDefault()
    }
    const onToggle = (e: Event) => handlers.current.onOpenChange?.((e as CustomEvent<{ open: boolean }>).detail.open)
    const onSearch = (e: Event) => handlers.current.onSearch?.((e as CustomEvent<TelescopeSearchDetail>).detail)
    el.addEventListener("select", onSelect)
    el.addEventListener("toggle", onToggle)
    el.addEventListener("search", onSearch)
    return () => {
      el.removeEventListener("select", onSelect)
      el.removeEventListener("toggle", onToggle)
      el.removeEventListener("search", onSearch)
    }
  }, [])

  useEffect(() => {
    if (props.open !== undefined && ref.current && ref.current.open !== props.open) ref.current.open = props.open
  }, [props.open])

  return (
    <telescope-search
      ref={ref}
      class={props.className}
      style={props.style}
      label={props.label}
      placeholder={props.placeholder}
      hint={props.hint}
      shortcut={off(props.shortcut)}
      side={props.side}
      length={props.length}
      max-results={props.maxResults}
      count-text={props.countText}
      empty-text={props.emptyText}
      empty-hint={props.emptyHint}
      sound={off(props.sound)}
      haptics={off(props.haptics)}
    >
      {props.items.map((it, i) => (
        <a key={i} href={it.href} target={it.target} data-description={it.description} data-keywords={it.keywords}>
          {it.label}
        </a>
      ))}
    </telescope-search>
  )
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "telescope-search": {
        ref?: React.Ref<TelescopeSearchElement>
        class?: string
        style?: React.CSSProperties
        label?: string
        placeholder?: string
        hint?: string
        shortcut?: string
        side?: string
        length?: number
        "max-results"?: number
        "count-text"?: string
        "empty-text"?: string
        "empty-hint"?: string
        sound?: string
        haptics?: string
        children?: React.ReactNode
      }
    }
  }
}
