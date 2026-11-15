// @ts-check
/** Run file: replay presets (built in and saved) chosen in Settings > Signal. */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'signal-presets',
  title: 'Signal: replay presets in Settings',
  status: 'ready',
  features: ['BCI-1', 'DIA-1'],
  order: 135,
  tests: ['tools/presets/presets.test.ts', 'src/ui/__tests__/signal-presets.test.ts', 'src/signal/__tests__/stages-p14.test.ts'],
  query: '?algo=intensity-v2',
  steps: [
    'Press Escape (or Settings on the start menu) and scroll to "Signal source".',
    'Choose "Rising tension", go back, turn on "Show composure" in Settings if you want the HUD line, and resume. Watch the HUD line and the lantern for about a minute.',
    'Back in Settings, try "Calm climb", "Jaw clench bursts", "Mixed climb" and "Noisy pin".',
    'Type a name and press "Save current signal as preset". Choose it, then use Export and Delete on its row.',
    'Choose "Simulator" again and press keys 1 to 4. Reload with ?preset=mixed-climb to start on a preset.',
    'To rebuild the built-in files: npm run presets:build (the output is identical each time).',
  ],
  expect: [
    'Choosing a source never reloads the page or resets the climb; the status line says which source is active.',
    'The badge says "Recorded replay · Not live input" during a preset. Intensity follows the preset: calm stays Lower, rising tension goes Lower, Midrange, Higher, mixed rises then falls.',
    'Noisy pin keeps the reading valid (the simulator reports contact as good) and the effects settle after the pin is reseated.',
    'A saved preset is still there after a reload; a fifth one asks you to delete one first. Everything works with Wi-Fi off: presets are repo files or browser storage.',
    'The wording stays on composure and signal activity. Muscle activity is named as part of the signal; there is no score, percentage or ranking of composure.',
  ],
});
