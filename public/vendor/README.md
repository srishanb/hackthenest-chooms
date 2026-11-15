# Vendored third-party code

Files here are copied unmodified from their source and served from our own origin, so the
game never loads code from a CDN (ballroom Wi-Fi cannot be trusted). Owner: integrator.
Do not edit these files; to update one, replace it and update this table.

| File | What | Version | Licence | Source | SHA-256 |
|---|---|---|---|---|---|
| `pieeg.js` | PiEEG JavaScript SDK (Octopus 16 over Web Bluetooth, built-in simulator, filters, FFT) | 1.3.0-octopus | MIT (stated in the file header and in the source repo's `package.json`) | https://github.com/pieeg-club/hello_world_octopus_16/blob/7ea78919d72a81193297222caa07b3c83577497c/pieeg.js | `8ecdf1037531284b96b03b093986f25335f06f5199ff33b17db3fd597937e818` |

`pieeg.js` is loaded by a plain `<script>` tag in `index.html` and defines one global, `PiEEG`.
Only `src/signal/` may use it (P1.1 adds the typed wrapper).
