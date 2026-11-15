// @ts-check
/** Run file: the real Octopus 16 board over Bluetooth (P3.1, Q-01). Needs the board and a person. */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'signal-live-board',
  title: 'Signal: real Octopus 16 board',
  status: 'partial',
  note: 'Built and unit-tested, but never run on a real board. Needs an Octopus 16, a charged 5 V power bank and Chrome or Edge. Full sheet: docs/OCTOPUS_TEST.md.',
  features: ['BCI-1', 'BCI-3', 'BCI-5', 'DIA-1'],
  order: 170,
  tests: ['src/signal/__tests__/pieeg-source.test.ts', 'src/signal/__tests__/sources.test.ts'],
  query: '?source=live&algo=passthrough-v0',
  steps: [
    'SAFETY: on a head, power the board only from a 5 V power bank. Never from a laptop port or the wall.',
    'Close cloud.pieeg.com and any other tab talking to the board: Bluetooth allows one connection.',
    'Click the game and press ` to open the overlay. It already reads source LIVE_EEG, but with "board not connected" and a huge sample age: no data is arriving and nothing else is running.',
    'Click "Connect Octopus 16" and pick the board (Octopus-16-XXXX) in the Bluetooth list.',
    'Watch sample age, quality and contact. Then lift the board off the head for a moment.',
    'Click "Run checkpoint" and follow it with real eyes open and closed. Save the downloaded file into recordings/.',
    'Click "Disconnect".',
  ],
  expect: [
    'The badge reads LIVE EEG from the moment the page opens; what changes on connecting is that sample age drops and stays under 500 ms.',
    'On a head with good contact, quality is above 0.5 and contact is close to 1.00.',
    'Lifting the board drops quality and valid turns false within about a second; the light eases to neutral.',
    'Cancelling the Bluetooth list changes nothing. (To see that it keeps a running source: open the plain address with the simulator, click Connect, cancel, and the simulator carries on.)',
    'The checkpoint ratio is above 1.3 on a real head. If it is not, re-seat the pins at Pz and try again.',
  ],
});
