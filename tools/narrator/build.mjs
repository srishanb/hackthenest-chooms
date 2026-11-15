/** Build-time only Gemini drafting and ElevenLabs downloads. Never imported by the browser.
 * Run with Node's --env-file=.env.local. Errors never print keys or API response bodies.
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const packFile = path.join(root, 'tools/narrator/intro-pack.json');
const draftFile = path.join(root, 'tools/narrator/draft-intros.json');
const voiceSettings = { stability: 0.65, similarity_boost: 0.75, style: 0.25, use_speaker_boost: true };
function key(name) {
  const value = process.env[name]?.trim();
  if (!value || /^(PASTE_|your_)/i.test(value)) throw Error(`Set ${name} privately in .env.local.`);
  return value;
}
async function request(url, options) {
  const response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw Error(`${new URL(url).hostname} returned HTTP ${response.status}. Check key permissions, credits and model access. Response body withheld.`);
  return response;
}
function validatePack(value) {
  if (!Array.isArray(value) || value.length !== 6) throw Error('The pack must contain exactly six intro lines.');
  const seen = new Set();
  return value.map((line) => {
    if (!line || !/^intro-[a-z0-9-]+$/.test(line.id) || seen.has(line.id) || typeof line.text !== 'string' ||
        line.text.trim().length < 20 || line.text.length > 240 || /[\r\n<>]/.test(line.text)) throw Error('Invalid intro pack. Review ids and text.');
    if (/\b(stress|diagnos\w*|therap\w*|emotion\w*)\b/i.test(line.text)) throw Error('Review narrator framing before generation.');
    seen.add(line.id); return { id: line.id, text: line.text.trim() };
  });
}
async function draft() {
  const secret = key('GEMINI_API_KEY');
  console.log('Checking available Gemini text models.');
  const modelList = await (await request('https://generativelanguage.googleapis.com/v1beta/models', { headers: {'x-goog-api-key':secret} })).json();
  const available = (modelList.models ?? []).filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => m.name);
  const preferred = process.env.GEMINI_MODEL ? `models/${process.env.GEMINI_MODEL.replace(/^models\//,'')}` : null;
  const model = preferred ?? ['models/gemini-3-flash-preview', 'models/gemini-2.5-flash'].find((id) => available.includes(id)) ?? available.find((id) => /flash/.test(id) && !/image|audio|live|tts|lite/.test(id));
  if (!model || !available.includes(model)) throw Error('No requested text-generation model is available to this Gemini key.');
  const prompt = `Write exactly six ORIGINAL short opening voice lines for Lighten Up, a pixel-art candle climbing game. Return only JSON: [{"id":"intro-01","text":"..."}, ... intro-06]. Each line 20–38 words, at most 240 characters. Narrator: warm mature male storyteller, dry wit, patient philosophical irony, sincere encouragement undermined by a small absurd observation about gravity, ledges, candles or climbing. Understated and a little annoyingly wise. Do not copy or imitate any named author, game narrator, real person, quotation or voice. No swearing, insults, judgments about the player, emotional/medical diagnoses or claims. Tease gravity and the climb, never the player's worth or abilities. No invented game rules, no death, lives or wax penalties; controls and physics never depend on a signal. No sound directions or brackets. Each intro stands alone and welcomes a new climb. Varied jokes, clean conversational delivery, no cliches.`;
  console.log(`Drafting six intros with ${model}.`);
  const response = await request(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`, {
    method:'POST', headers:{'x-goog-api-key':secret,'Content-Type':'application/json'},
    body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.85,maxOutputTokens:16000}}),
  });
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.filter((part) => !part.thought && typeof part.text === 'string').map((part) => part.text).join('');
  if (!text) throw Error('Gemini returned no usable draft.');
  const lines = validatePack(JSON.parse(text));
  await writeFile(draftFile, JSON.stringify(lines,null,2)+'\n');
  console.log(`Saved six candidates to tools/narrator/draft-intros.json using ${model}. Review, then copy to intro-pack.json before building.`);
}
async function build() {
  const secret = key('ELEVENLABS_API_KEY'), voice = key('ELEVENLABS_VOICE_ID');
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(voice)) throw Error('Voice ID format is invalid.');
  const model = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
  const lines = validatePack(JSON.parse(await readFile(packFile,'utf8')));
  const output = path.join(root, 'public/assets/audio/narrator'); await mkdir(output,{recursive:true});
  const manifest = [];
  for (const line of lines) {
    const hash = createHash('sha256').update(JSON.stringify({text:line.text,voice,model,voiceSettings})).digest('hex').slice(0,12);
    const file = `${line.id}-${hash}.mp3`, target = path.join(output,file);
    let exists = false; try { await access(target); exists=true; } catch { /* First generation. */ }
    if (!exists) {
      const response = await request(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
        method:'POST',headers:{'xi-api-key':secret,'Content-Type':'application/json','Accept':'audio/mpeg'},
        body:JSON.stringify({text:line.text,model_id:model,voice_settings:voiceSettings}),
      });
      if (!response.headers.get('content-type')?.includes('audio/')) throw Error('Speech API did not return audio.');
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 1000) throw Error('Speech clip is unexpectedly small.');
      await writeFile(target,bytes,{flag:'wx'}); console.log(`Downloaded ${file}`);
    } else console.log(`Reused ${file}`);
    manifest.push({...line,clip:`assets/audio/narrator/${file}`});
  }
  await writeFile(path.join(output,'manifest.json'),JSON.stringify({voiceId:voice,model,voiceSettings,lines:manifest},null,2)+'\n');
  await writeFile(path.join(root,'src/content/narrator/lines.ts'),`/** Original intro bank. Gemini drafts reviewed before local ElevenLabs generation. No runtime API calls. */\nimport type { NarratorLine } from '../../shared/contracts/content';\nexport const NARRATOR_LINES: readonly NarratorLine[] = ${JSON.stringify(manifest,null,2)};\n`);
  console.log('Published six local intro clips and their caption text. No keys were printed or written into assets.');
}
try {
  const mode=process.argv[2];
  if(mode==='draft') await draft();
  else if(mode==='build') await build();
  else if(mode==='check') { for(const name of ['GEMINI_API_KEY','ELEVENLABS_API_KEY','ELEVENLABS_VOICE_ID']) key(name); console.log('All three private settings are present. Values withheld.'); }
  else throw Error('Usage: node --env-file=.env.local tools/narrator/build.mjs check|draft|build');
} catch(error) { console.error(error instanceof Error ? error.message : 'Narrator build failed. Details withheld.'); process.exitCode=1; }
