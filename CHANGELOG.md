# Changelog

All notable changes to this project are listed here. Versions follow [semantic versioning](https://semver.org).

## Unreleased

## 0.1.0

First version.

- `<telescope-search>` web component and a React adapter on one framework-free engine.
- Closed, the field peeks out of the eyepiece with its label and a key hint; hover pulls it a little, press pushes it in.
- Opening pulls the long tube first, then each collar ring knocks into place with a click; closing runs the chain back.
- Results on one sheet that slides down from under the tube, with a sliding highlight and a return-key hint.
- Matching that ignores case and accents, ranked by title first; descriptions and hidden keywords are searched too.
- Options: `label`, `placeholder`, `hint`, `shortcut`, `side`, `length`, `max-results`, `count-text`, `empty-text`, `empty-hint`, `sound`, `haptics`.
- `/` and ⌘K shortcuts, combobox keyboard support, `select`, `toggle` and `search` events, reduced-motion support.
- Demo, props playground and an in-browser self-test.
