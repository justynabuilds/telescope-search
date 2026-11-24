// Shadow-root styles. Theme with the --ts-* custom properties (set on the element or any parent).
// Every shade, ring and shadow is mixed from them, so any palette still reads as lit.
export const styles = /* css */ `
:host{
  --ts-tube:#FFFFFF;
  --ts-ring:#DFE1E6;
  --ts-text:#141415;
  --ts-muted:#8E8E95;
  --ts-shade:#3C3C50;
  --ts-shadow:16 18 40;
  --ts-focus:rgb(20 20 21 / .32);
  --ts-font:inherit;
  position:relative;display:inline-block;vertical-align:middle;z-index:50;
  font-family:var(--ts-font);-webkit-font-smoothing:antialiased;
}
:host([hidden]){display:none}

.foot{position:relative;height:48px}
.track{position:absolute;top:0;height:48px;pointer-events:none}
.seg,.base{position:absolute;top:50%;transform:translateY(-50%);pointer-events:auto;box-sizing:border-box}

/* tube bodies: a cylinder lit from above: soft top edge, bright band, falloff underneath */
.seg,.base{
  background:linear-gradient(180deg,
    color-mix(in srgb, var(--ts-tube) 95%, var(--ts-shade)) 0%, var(--ts-tube) 17%,
    color-mix(in srgb, var(--ts-tube) 99%, var(--ts-shade)) 38%, color-mix(in srgb, var(--ts-tube) 95%, var(--ts-shade)) 72%,
    color-mix(in srgb, var(--ts-tube) 90%, var(--ts-shade)) 100%);
  box-shadow:inset 0 1px 0 rgb(255 255 255 / .9), inset 0 -1px 0 rgb(var(--ts-shadow) / .05),
    0 0 0 .5px rgb(var(--ts-shadow) / .17), var(--ts-joint, -2px) 0 3px -1px rgb(var(--ts-shadow) / .13),
    0 1px 1px rgb(var(--ts-shadow) / .05), 0 8px 18px -12px rgb(var(--ts-shadow) / .3)}
:host([side="right"]){--ts-joint:2px}
.base{all:unset;box-sizing:border-box;position:absolute;top:50%;transform:translateY(-50%);pointer-events:auto;
  width:56px;height:48px;z-index:4;cursor:pointer;display:grid;align-items:center;justify-items:end;padding:0 15px;
  color:var(--ts-text);-webkit-tap-highlight-color:transparent;
  border-radius:5px 24px 24px 5px;
  background:linear-gradient(180deg,
    color-mix(in srgb, var(--ts-tube) 95%, var(--ts-shade)) 0%, var(--ts-tube) 17%,
    color-mix(in srgb, var(--ts-tube) 99%, var(--ts-shade)) 38%, color-mix(in srgb, var(--ts-tube) 95%, var(--ts-shade)) 72%,
    color-mix(in srgb, var(--ts-tube) 90%, var(--ts-shade)) 100%);
  box-shadow:inset 0 1px 0 #fff, inset 0 -1px 0 rgb(var(--ts-shadow) / .06),
    0 0 0 .5px rgb(var(--ts-shadow) / .18), var(--ts-joint, -2px) 0 3px -1px rgb(var(--ts-shadow) / .15),
    0 1px 2px rgb(var(--ts-shadow) / .06), 0 12px 24px -14px rgb(var(--ts-shadow) / .36)}
.base:focus-visible{outline:1.5px solid var(--ts-focus);outline-offset:3px}
.base svg{width:18px;height:18px;display:block;position:relative}
.seg[data-k="1"]{height:44px;border-radius:3.5px 22px 22px 3.5px;z-index:3}
.seg[data-k="2"]{height:40px;border-radius:2.5px 20px 20px 2.5px;z-index:2}
.seg[data-k="3"]{height:36px;border-radius:18px;z-index:1}
:host(:not([open])) .seg{cursor:pointer}
:host([side="right"]) .base{justify-items:start;border-radius:24px 5px 5px 24px}
:host([side="right"]) .seg[data-k="1"]{border-radius:22px 3.5px 3.5px 22px}
:host([side="right"]) .seg[data-k="2"]{border-radius:20px 2.5px 2.5px 20px}

/* satin rings: the lip at the mouth of every tube a smaller one slides out of */
.base::before,.seg[data-k="1"]::before,.seg[data-k="2"]::before{
  content:"";position:absolute;top:0;bottom:0;left:0;width:5px;pointer-events:none;
  background:linear-gradient(180deg, var(--ts-ring) 0%, color-mix(in srgb, var(--ts-ring) 22%, #fff) 20%,
    color-mix(in srgb, var(--ts-ring) 62%, #fff) 48%, color-mix(in srgb, var(--ts-ring) 94%, var(--ts-shade)) 78%,
    color-mix(in srgb, var(--ts-ring) 84%, var(--ts-shade)) 100%);
  box-shadow:inset 1px 0 0 rgb(255 255 255 / .95), inset -.5px 0 0 rgb(var(--ts-shadow) / .16), inset 0 1px 0 rgb(255 255 255 / .8)}
.base::before{border-radius:5px 0 0 5px}
.seg[data-k="1"]::before{border-radius:3.5px 0 0 3.5px}
.seg[data-k="2"]::before{border-radius:2.5px 0 0 2.5px}
:host([side="right"]) .base::before,:host([side="right"]) .seg[data-k="1"]::before,:host([side="right"]) .seg[data-k="2"]::before{left:auto;right:0;
  box-shadow:inset -1px 0 0 rgb(255 255 255 / .95), inset .5px 0 0 rgb(var(--ts-shadow) / .16), inset 0 1px 0 rgb(255 255 255 / .8)}
:host([side="right"]) .base::before{border-radius:0 5px 5px 0}
:host([side="right"]) .seg[data-k="1"]::before{border-radius:0 3.5px 3.5px 0}
:host([side="right"]) .seg[data-k="2"]::before{border-radius:0 2.5px 2.5px 0}

.input{all:unset;box-sizing:border-box;position:absolute;top:50%;transform:translateY(-50%);height:32px;z-index:5;
  font:inherit;font-size:14px;letter-spacing:-.006em;color:var(--ts-text);caret-color:var(--ts-text);
  pointer-events:none;min-width:0;cursor:text}
.input::placeholder{color:var(--ts-muted);opacity:1}
.input::selection{background:rgb(var(--ts-shadow) / .12)}
.input::-webkit-search-cancel-button{display:none}
:host([open]) .input{pointer-events:auto}
.hint,.count{position:absolute;top:50%;transform:translateY(-50%);z-index:6;pointer-events:none;white-space:nowrap}
.hint{box-sizing:border-box;font-size:11px;line-height:18px;min-width:20px;padding:0 5px;border-radius:6px;text-align:center;color:var(--ts-muted);
  background:linear-gradient(180deg, color-mix(in srgb, var(--ts-tube) 95%, var(--ts-shade)), color-mix(in srgb, var(--ts-tube) 98.5%, var(--ts-shade)));
  box-shadow:inset 0 0 0 .5px rgb(var(--ts-shadow) / .15), inset 0 1px 1px rgb(var(--ts-shadow) / .05), 0 1px 0 #fff}
.hint[hidden]{display:none}
.count{font-size:12px;line-height:1;color:var(--ts-muted);opacity:0;transition:opacity .2s;font-variant-numeric:tabular-nums}

/* results: one sheet that slides down from under the tube */
.drop{position:absolute;top:48px;padding:0 12px 32px;overflow:hidden;pointer-events:none;box-sizing:border-box}
/* the sheet grows down from just under the field: its top edge stays put, its bottom edge travels,
   and each result fades in as the edge reaches it */
.panel{position:relative;margin-top:8px;border-radius:18px;padding:6px;height:12px;box-sizing:border-box;overflow:hidden;opacity:0;
  background:linear-gradient(180deg, var(--ts-tube) 0%, color-mix(in srgb, var(--ts-tube) 98.5%, var(--ts-shade)) 100%);
  box-shadow:inset 0 1px 0 rgb(255 255 255 / .9), 0 0 0 .5px rgb(var(--ts-shadow) / .15),
    0 1px 2px rgb(var(--ts-shadow) / .05), 0 14px 30px -16px rgb(var(--ts-shadow) / .3);
  transition:height .26s cubic-bezier(.4,0,.2,1), opacity .16s ease .1s}
.drop[data-shown] .panel{opacity:1;pointer-events:auto;transition:height .44s cubic-bezier(.22,1,.36,1), opacity .14s ease}
.hl{position:absolute;top:0;left:6px;right:6px;border-radius:12px;opacity:0;
  background:linear-gradient(180deg, rgb(var(--ts-shadow) / .035), rgb(var(--ts-shadow) / .055));
  box-shadow:inset 0 0 0 .5px rgb(var(--ts-shadow) / .06);
  transition:transform .26s cubic-bezier(.16,1,.3,1), height .26s cubic-bezier(.16,1,.3,1), opacity .2s}
.list{margin:0;padding:0;list-style:none}
.row{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:9px 12px;border-radius:12px;cursor:pointer}
.row[aria-disabled="true"]{cursor:default}
.tx{display:grid;gap:2px;min-width:0}
.t{font-size:14px;letter-spacing:-.006em;color:var(--ts-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.d{font-size:12px;color:var(--ts-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.d:empty{display:none}
mark{background:none;color:var(--ts-text);font-weight:500}
.ret{width:22px;height:20px;border-radius:6px;display:grid;place-items:center;color:var(--ts-muted);opacity:0;transform:translateX(-3px);
  transition:opacity .2s, transform .26s cubic-bezier(.16,1,.3,1);
  background:linear-gradient(180deg, color-mix(in srgb, var(--ts-tube) 95%, var(--ts-shade)), color-mix(in srgb, var(--ts-tube) 98.5%, var(--ts-shade)));
  box-shadow:inset 0 0 0 .5px rgb(var(--ts-shadow) / .15), 0 1px 0 #fff}
.ret svg{width:12px;height:12px;display:block}
.row[aria-selected="true"] .ret{opacity:1;transform:none}

.measure{position:absolute;visibility:hidden;white-space:pre;font-size:14px;letter-spacing:-.006em;pointer-events:none}

@media (prefers-reduced-motion: reduce){
  .panel,.drop[data-shown] .panel,.hl,.ret,.count{transition:none}
}
`
