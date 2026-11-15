/** Choose and audition local stock voices through the existing narrator audio bus. */
import { DEFAULT_NARRATOR_VOICE, NARRATOR_VOICES, NARRATOR_VOICE_STORAGE_KEY, NARRATOR_VOICE_EVENT } from '../../../config/audio.config';
import { getLocalStorage } from '../../../shared/safe-storage';
import type { EventBus } from '../../../shared/contracts/events';
import type { Store } from '../../../shared/store';
import { t } from '../../strings';
export function mountNarratorVoiceControl(root: HTMLElement, settingsOpen: Store<boolean>, bus: EventBus): () => void {
  const storage = getLocalStorage(window);
  const box = document.createElement('fieldset'); box.className = 'narrator-voice-control';
  const legend = document.createElement('legend'); legend.textContent = t('narrator.voice.title');
  const label = document.createElement('label'); label.className = 'menu-row'; label.textContent = t('narrator.voice.label');
  const select = document.createElement('select'); select.setAttribute('aria-label', t('narrator.voice.label'));
  for (const voice of NARRATOR_VOICES) { const option = document.createElement('option'); option.value = voice.id; option.textContent = t(voice.nameKey); select.append(option); }
  let saved: string | null = null; try { saved = storage?.getItem(NARRATOR_VOICE_STORAGE_KEY) ?? null; } catch { /* Live choice still works. */ }
  select.value = NARRATOR_VOICES.some(voice=>voice.id===saved) ? saved! : DEFAULT_NARRATOR_VOICE;
  const send = (preview = false): void => { window.dispatchEvent(new CustomEvent(NARRATOR_VOICE_EVENT,{detail:{voice:select.value,preview}})); };
  select.addEventListener('change', () => { try { storage?.setItem(NARRATOR_VOICE_STORAGE_KEY,select.value); } catch { /* Session choice. */ } send(); });
  const preview = document.createElement('button'); preview.type='button'; preview.textContent=t('narrator.voice.preview'); preview.addEventListener('click',()=>send(true));
  const stop = document.createElement('button'); stop.type='button'; stop.textContent=t('narrator.voice.stop'); stop.addEventListener('click',()=>window.dispatchEvent(new CustomEvent(NARRATOR_VOICE_EVENT,{detail:{stop:true}})));
  const hint = document.createElement('small'); hint.textContent=t('narrator.voice.hint');
  const caption = document.createElement('p'); caption.className='narrator-voice-control__caption'; caption.setAttribute('role','status');
  const offLine = bus.on('narrator_line', event => { caption.textContent = settingsOpen.get() ? event.text : ''; });
  label.append(select); box.append(legend,label,preview,stop,caption,hint); root.append(box);
  const offOpen=settingsOpen.subscribe(open=>{if(!open)window.dispatchEvent(new CustomEvent(NARRATOR_VOICE_EVENT,{detail:{stop:true}}));});
  return ()=>{offOpen();offLine();box.remove();};
}
