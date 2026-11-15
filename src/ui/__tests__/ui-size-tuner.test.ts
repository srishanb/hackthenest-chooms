/** Corrupt or old local preview data must not hide or explode the interface. */
import { expect, it } from 'vitest';
import { parseUiPreviewSizes } from '../components/source-badge/ui-size-tuner';
it('defaults missing, malformed and non-object preview data', () => {
  for (const raw of [null, 'bad', 'null', '15', '{}']) expect(parseUiPreviewSizes(raw)).toEqual({tutorial:100,stats:100});
});
it('keeps the two independently chosen scales and clamps untrusted storage', () => {
  expect(parseUiPreviewSizes('{"tutorial":120,"stats":85}')).toEqual({tutorial:120,stats:85});
  expect(parseUiPreviewSizes('{"tutorial":500,"stats":-2}')).toEqual({tutorial:150,stats:70});
  expect(parseUiPreviewSizes('{"tutorial":"120","stats":null}')).toEqual({tutorial:100,stats:100});
});
