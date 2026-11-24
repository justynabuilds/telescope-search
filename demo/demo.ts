import "../src/element/index.ts"

// The demo never leaves the page: a pick just closes the search.
document.querySelector("telescope-search")?.addEventListener("select", (e) => e.preventDefault())
