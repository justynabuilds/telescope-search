import { TelescopeSearchElement } from "./telescope-search-element.ts"

export { TelescopeSearchElement }
export type { TelescopeSelectDetail, TelescopeSearchDetail } from "./telescope-search-element.ts"

if (!customElements.get("telescope-search")) customElements.define("telescope-search", TelescopeSearchElement)

declare global {
  interface HTMLElementTagNameMap {
    "telescope-search": TelescopeSearchElement
  }
}
