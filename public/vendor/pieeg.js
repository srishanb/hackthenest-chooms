/**
 * PiEEG JavaScript SDK (pieeg.js) — High-Performance Hackathon & Octopus 16 Edition
 *
 * Zero-dependency browser library for connecting to PiEEG / Octopus 16 / IronBCI
 * boards via Web Bluetooth, Web Serial, or the built-in 250 Hz Synthetic Simulator.
 *
 * Supported devices (select via `connectBLE` / `connectSerial` / `connectSimulator`):
 *   - 'octopus-16'  (2 × ADS131M08, BLE)  — 16 ch @ 250 Hz  [Octopus 16 dry pogo array]
 *   - 'ironbci-8'   (1 × ADS1299, BLE)    — 8 ch  @ 250 Hz  [default BLE]
 *   - 'ironbci-16'  (2 × ADS1299, BLE)    — 16 ch @ 250 Hz
 *   - 'ironbci-32'  (AD7771, Web Serial)  — 32 ch @ 500 Hz  [default serial]
 *
 * Performance & Hackathon Highlights:
 *   1. Precomputed Radix-2 FFT (Int32Array bit-reversal + Float64Array twiddle tables)
 *      with zero trig calls or TypedArray allocations in the hot analysis loop.
 *   2. Transposed Direct Form II Biquad Cascade (5th-order Butterworth bandpass + IIR notch)
 *      and allocation-free circular Hampel MAD spike rejection.
 *   3. Packet-counter telemetry (0..255 byte [1]) tracking dropped BLE notifications
 *      and true measured sample rate (~244.14 Hz on 8.000 MHz clock vs 250 Hz nominal).
 *   4. Octopus 16 18-pin hexagonal geometry (16 signal pins in mm + REF + GND),
 *      per-channel RMS contact quality checker, and k-NN Surface Laplacian spatial filter.
 *   5. Built-in 250 Hz Synthetic Simulator (`connectSimulator`) with live injectable
 *      Alpha bursts (10 Hz), eye blinks (Fp), jaw clenches (EMG), and poor-contact pins.
 *
 * @version 1.3.0-octopus
 * @license MIT
 * @see https://github.com/pieeg-club/PiEEG-server
 * @see https://docs.pieeg.com/hardware/devices/Octopus_16
 */

(function (global) {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // Constants & Hardware Geometry
  // ═══════════════════════════════════════════════════════════════════════════

  const VERSION = '1.3.0-octopus';

  // Web Serial framing (IronBCI-32)
  const SERIAL_BAUD_RATE = 921600;
  const SERIAL_NUM_CHANNELS = 32;
  const SERIAL_SAMPLE_RATE = 500;
  const SERIAL_START_BYTE = 0xA0;
  const SERIAL_END_BYTE = 0xC0;

  // AD7771 conversion (IronBCI-32 serial frames)
  const AD7771_VREF = 2.5;
  const AD7771_GAIN = 8.0;
  const AD7771_FULL_SCALE = 8388607; // 2^23 - 1
  const AD7771_SIGN_BIT = 8388608;   // 2^23

  // ADS131M08 conversion (Octopus 16 BLE frames)
  // Vref = 1.2 V internal, Gain = 4.0 (GAIN=0x2222), Full-scale = 2^23 - 1 = 8388607
  // ~0.03576279 µV per LSB
  const OCTOPUS16_UV_SCALE = (1.2 / 4.0 / 8388607.0) * 1000000;
  const OCTOPUS16_NOMINAL_SPS = 250;
  // Boards using 8.000 MHz LEDC clock run at 4.000 MHz / 16384 = 244.140625 SPS
  const OCTOPUS16_LEDC8MHZ_SPS = 8000000 / (2 * 16384);

  // FFT / Band power
  const FFT_SIZE = 256;
  const FREQUENCY_BANDS = [
    { name: 'Delta', label: 'δ Delta', low: 0.5, high: 4, color: '#8b5cf6' },
    { name: 'Theta', label: 'θ Theta', low: 4, high: 8, color: '#06b6d4' },
    { name: 'Alpha', label: 'α Alpha', low: 8, high: 13, color: '#22c55e' },
    { name: 'Beta',  label: 'β Beta',  low: 13, high: 30, color: '#f59e0b' },
    { name: 'Gamma', label: 'γ Gamma', low: 30, high: 100, color: '#ef4444' },
  ];

  /**
   * Exact physical positions of the 16 signal pogo pins on the 26 mm round
   * Octopus 16 board (in millimetres relative to board centre).
   * Channels 1–8 (indices 0–7) belong to ADC 1; Channels 9–16 (indices 8–15) belong to ADC 2.
   */
  const OCTOPUS_16_PINS = [
    { ch: 1,  index: 0,  adc: 1, x:  10.14, y:  -2.72 },
    { ch: 2,  index: 1,  adc: 1, x:   7.43, y:  -7.43 },
    { ch: 3,  index: 2,  adc: 1, x:   2.75, y:  -4.77 },
    { ch: 4,  index: 3,  adc: 1, x:   2.72, y: -10.15 },
    { ch: 5,  index: 4,  adc: 1, x:  -2.72, y: -10.14 },
    { ch: 6,  index: 5,  adc: 1, x:  -2.75, y:  -4.77 },
    { ch: 7,  index: 6,  adc: 1, x:  -7.42, y:  -7.42 },
    { ch: 8,  index: 7,  adc: 1, x: -10.14, y:  -2.73 },
    { ch: 9,  index: 8,  adc: 2, x: -10.14, y:   2.72 },
    { ch: 10, index: 9,  adc: 2, x:  -7.43, y:   7.43 },
    { ch: 11, index: 10, adc: 2, x:  -2.75, y:   4.76 },
    { ch: 12, index: 11, adc: 2, x:  -2.72, y:  10.14 },
    { ch: 13, index: 12, adc: 2, x:   2.72, y:  10.15 },
    { ch: 14, index: 13, adc: 2, x:   2.75, y:   4.77 },
    { ch: 15, index: 14, adc: 2, x:   7.43, y:   7.42 },
    { ch: 16, index: 15, adc: 2, x:  10.14, y:   2.71 },
  ];

  // Precompute 4 nearest spatial neighbours per pin on the Octopus 16 hex array
  // for fast O(16) Surface Laplacian (Current Source Density) filtering.
  const OCTOPUS_16_NEIGHBORS = OCTOPUS_16_PINS.map((pin, idx) => {
    const dists = OCTOPUS_16_PINS
      .map((other, otherIdx) => ({
        index: otherIdx,
        dist: Math.hypot(pin.x - other.x, pin.y - other.y),
      }))
      .filter((d) => d.index !== idx && d.dist <= 6.8) // immediate hex ring (~5.38 mm pitch)
      .sort((a, b) => a.dist - b.dist);
    return dists.map((d) => d.index);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Utilities
  // ═══════════════════════════════════════════════════════════════════════════

  function isWebBluetoothSupported() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  function isWebSerialSupported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Zero-Allocation Ring Buffer
  // ═══════════════════════════════════════════════════════════════════════════

  class RingBuffer {
    constructor(size) {
      this.buffer = new Float64Array(size);
      this.size = size;
      this.writeIndex = 0;
      this.count = 0;
    }

    push(value) {
      this.buffer[this.writeIndex] = value;
      this.writeIndex = (this.writeIndex + 1) % this.size;
      if (this.count < this.size) this.count++;
    }

    get(index) {
      if (index >= this.count) return 0;
      const offset = (this.writeIndex - this.count + index + this.size) % this.size;
      return this.buffer[offset];
    }

    /**
     * Copy the latest `n` samples chronologically into `dest` (Float64Array/Float32Array)
     * without allocating temporary arrays. Returns true if `n` samples were available.
     */
    copyLatestTo(dest, n = dest.length) {
      if (this.count < n) return false;
      const size = this.size;
      let idx = (this.writeIndex - n + size) % size;
      for (let i = 0; i < n; i++) {
        dest[i] = this.buffer[idx];
        idx++;
        if (idx === size) idx = 0;
      }
      return true;
    }

    /**
     * Compute Root Mean Square (RMS) in µV over the latest `windowSamples`
     * (after subtracting mean to ignore residual DC offset).
     */
    computeRms(windowSamples = 125) {
      const n = Math.min(this.count, windowSamples);
      if (n < 2) return 0;
      const size = this.size;
      let start = (this.writeIndex - n + size) % size;
      let sum = 0;
      let idx = start;
      for (let i = 0; i < n; i++) {
        sum += this.buffer[idx];
        idx++;
        if (idx === size) idx = 0;
      }
      const mean = sum / n;
      let sq = 0;
      idx = start;
      for (let i = 0; i < n; i++) {
        const d = this.buffer[idx] - mean;
        sq += d * d;
        idx++;
        if (idx === size) idx = 0;
      }
      return Math.sqrt(sq / n);
    }

    isFull() {
      return this.count >= this.size;
    }

    clear() {
      this.count = 0;
      this.writeIndex = 0;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // High-Performance FFT Engine (Precomputed Bit-Reversal & Twiddle Tables)
  // ═══════════════════════════════════════════════════════════════════════════

  class FFTEngine {
    constructor(size, sampleRate) {
      if (size <= 0 || (size & (size - 1)) !== 0) {
        throw new Error('FFT size must be a power of 2');
      }
      this.size = size;
      this.sampleRate = sampleRate;
      this.bins = (size >> 1) + 1;
      this.df = sampleRate / size;

      this.window = new Float64Array(size);
      this.real = new Float64Array(size);
      this.imag = new Float64Array(size);
      this._scratch = new Float64Array(size);

      // Precompute Hanning window & energy normalisation (PSD in µV²/Hz)
      let winEnergy = 0;
      for (let i = 0; i < size; i++) {
        const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
        this.window[i] = w;
        winEnergy += w * w;
      }
      this.norm = 2.0 / (sampleRate * winEnergy);

      // Precompute frequency axis
      this.freqs = new Float64Array(this.bins);
      for (let i = 0; i < this.bins; i++) {
        this.freqs[i] = i * this.df;
      }

      // Precompute bit-reversal permutation table
      let logN = 0;
      for (let x = size; x > 1; x >>= 1) logN++;
      this.bitReversed = new Int32Array(size);
      for (let i = 0; i < size; i++) {
        let r = 0;
        let v = i;
        for (let b = 0; b < logN; b++) {
          r = (r << 1) | (v & 1);
          v >>= 1;
        }
        this.bitReversed[i] = r;
      }

      // Precompute twiddle factors exp(-j * 2π * k / N)
      const half = size >> 1;
      this.twRe = new Float64Array(half);
      this.twIm = new Float64Array(half);
      for (let k = 0; k < half; k++) {
        const angle = (-2 * Math.PI * k) / size;
        this.twRe[k] = Math.cos(angle);
        this.twIm[k] = Math.sin(angle);
      }
    }

    analyse(signal) {
      const N = this.size;
      const real = this.real;
      const imag = this.imag;
      const win = this.window;
      const bitRev = this.bitReversed;
      const twRe = this.twRe;
      const twIm = this.twIm;

      // Apply window & bit-reversal in a single pass
      for (let i = 0; i < N; i++) {
        const j = bitRev[i];
        real[i] = signal[j] * win[j];
        imag[i] = 0;
      }

      // Cooley-Tukey butterfly stages with precomputed twiddles
      for (let stageSize = 2; stageSize <= N; stageSize <<= 1) {
        const half = stageSize >> 1;
        const step = N / stageSize;
        for (let i = 0; i < N; i += stageSize) {
          for (let j = 0; j < half; j++) {
            const tw = j * step;
            const wr = twRe[tw];
            const wi = twIm[tw];
            const even = i + j;
            const odd = even + half;
            const tr = wr * real[odd] - wi * imag[odd];
            const ti = wr * imag[odd] + wi * real[odd];
            real[odd] = real[even] - tr;
            imag[odd] = imag[even] - ti;
            real[even] += tr;
            imag[even] += ti;
          }
        }
      }

      // Compute one-sided PSD (µV²/Hz)
      const bins = this.bins;
      const psd = new Float64Array(bins);
      const freqs = this.freqs;
      const norm = this.norm;
      const df = this.df;

      let totalPower = 0;
      let maxPower = 0;
      let dominantFreq = 0;

      for (let k = 0; k < bins; k++) {
        const pw = real[k] * real[k] + imag[k] * imag[k];
        const scale = k === 0 || k === bins - 1 ? 0.5 : 1.0;
        const val = pw * norm * scale;
        psd[k] = val;
        // Ignore <0.5 Hz DC bin when finding dominant physiological frequency
        if (k > 0) {
          totalPower += val * df;
          if (val > maxPower) {
            maxPower = val;
            dominantFreq = freqs[k];
          }
        }
      }

      // Integrate band powers (µV²)
      const bandPowers = {};
      for (let b = 0; b < FREQUENCY_BANDS.length; b++) {
        const band = FREQUENCY_BANDS[b];
        let bp = 0;
        for (let k = 0; k < bins; k++) {
          const f = freqs[k];
          if (f >= band.low && f < band.high) {
            bp += psd[k] * df;
          }
        }
        bandPowers[band.name] = bp;
      }

      return { psd, freqs, bandPowers, totalPower, dominantFreq };
    }

    analyseRing(ringBuffer) {
      if (!ringBuffer.copyLatestTo(this._scratch, this.size)) return null;
      return this.analyse(this._scratch);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DSP: Hampel spike filter → Butterworth bandpass → IIR notch
  // ═══════════════════════════════════════════════════════════════════════════

  function _cadd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
  function _csub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
  function _cmul(a, b) {
    return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
  }
  function _cdiv(a, b) {
    const d = b.re * b.re + b.im * b.im;
    return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
  }
  function _csqrt(z) {
    const r = Math.hypot(z.re, z.im);
    const re = Math.sqrt((r + z.re) / 2);
    let im = Math.sqrt((r - z.re) / 2);
    if (z.im < 0) im = -im;
    return { re, im };
  }

  function _pairPoles(poles) {
    const EPS = 1e-9;
    const used = new Array(poles.length).fill(false);
    const pairs = [];
    for (let i = 0; i < poles.length; i++) {
      if (used[i]) continue;
      const p = poles[i];
      used[i] = true;
      if (Math.abs(p.im) < EPS) {
        let j = -1;
        for (let k = i + 1; k < poles.length; k++) {
          if (!used[k] && Math.abs(poles[k].im) < EPS) { j = k; break; }
        }
        if (j >= 0) {
          used[j] = true;
          pairs.push([{ re: p.re, im: 0 }, { re: poles[j].re, im: 0 }]);
        } else {
          pairs.push([{ re: p.re, im: 0 }, { re: 0, im: 0 }]);
        }
      } else {
        let best = -1;
        let bestD = Infinity;
        for (let k = i + 1; k < poles.length; k++) {
          if (used[k]) continue;
          const d = Math.abs(poles[k].re - p.re) + Math.abs(poles[k].im + p.im);
          if (d < bestD) { bestD = d; best = k; }
        }
        if (best >= 0) { used[best] = true; pairs.push([p, poles[best]]); }
        else { pairs.push([p, { re: p.re, im: -p.im }]); }
      }
    }
    return pairs;
  }

  function _designBandpass(order, lowHz, highHz, fs) {
    const warp = (f) => 2 * fs * Math.tan((Math.PI * f) / fs);
    const w1 = warp(lowHz);
    const w2 = warp(highHz);
    const bw = w2 - w1;
    const w0sq = w1 * w2;

    const proto = [];
    for (let k = 0; k < order; k++) {
      const theta = (Math.PI * (2 * k + order + 1)) / (2 * order);
      proto.push({ re: Math.cos(theta), im: Math.sin(theta) });
    }

    const analogPoles = [];
    for (const p of proto) {
      const bwp = { re: bw * p.re, im: bw * p.im };
      const disc = _csub(_cmul(bwp, bwp), { re: 4 * w0sq, im: 0 });
      const sq = _csqrt(disc);
      analogPoles.push(_cdiv(_cadd(bwp, sq), { re: 2, im: 0 }));
      analogPoles.push(_cdiv(_csub(bwp, sq), { re: 2, im: 0 }));
    }

    const fs2 = 2 * fs;
    const bilinear = (s) =>
      _cdiv(_cadd({ re: fs2, im: 0 }, s), _csub({ re: fs2, im: 0 }, s));
    const digitalPoles = analogPoles.map(bilinear);

    const sections = _pairPoles(digitalPoles).map(([p, q]) => ({
      b0: 1, b1: 0, b2: -1,
      a1: -(p.re + q.re),
      a2: p.re * q.re - p.im * q.im,
    }));

    const wc = (2 * Math.PI * Math.sqrt(lowHz * highHz)) / fs;
    const zinv = { re: Math.cos(-wc), im: Math.sin(-wc) };
    const zinv2 = _cmul(zinv, zinv);
    let H = { re: 1, im: 0 };
    for (const s of sections) {
      const num = _cadd(_cadd({ re: s.b0, im: 0 }, _cmul({ re: s.b1, im: 0 }, zinv)),
        _cmul({ re: s.b2, im: 0 }, zinv2));
      const den = _cadd(_cadd({ re: 1, im: 0 }, _cmul({ re: s.a1, im: 0 }, zinv)),
        _cmul({ re: s.a2, im: 0 }, zinv2));
      H = _cmul(H, _cdiv(num, den));
    }
    const mag = Math.hypot(H.re, H.im);
    const gain = mag > 0 ? 1 / mag : 1;
    if (sections.length > 0) {
      sections[0].b0 *= gain;
      sections[0].b1 *= gain;
      sections[0].b2 *= gain;
    }
    return sections;
  }

  function _designNotch(freq, q, fs) {
    const w0 = (2 * Math.PI * freq) / fs;
    const cw = Math.cos(w0);
    const sw = Math.sin(w0);
    const alpha = sw / (2 * q);
    const a0 = 1 + alpha;
    return {
      b0: 1 / a0, b1: (-2 * cw) / a0, b2: 1 / a0,
      a1: (-2 * cw) / a0, a2: (1 - alpha) / a0,
    };
  }

  class BiquadCascade {
    constructor(sections) {
      this.sections = sections;
      this.s1 = new Float64Array(sections.length);
      this.s2 = new Float64Array(sections.length);
    }
    process(x) {
      let v = x;
      for (let i = 0; i < this.sections.length; i++) {
        const s = this.sections[i];
        const y = s.b0 * v + this.s1[i];
        this.s1[i] = s.b1 * v - s.a1 * y + this.s2[i];
        this.s2[i] = s.b2 * v - s.a2 * y;
        v = y;
      }
      return v;
    }
  }

  class MultichannelBandpass {
    constructor(numChannels, lowcut, highcut, fs, order = 5) {
      const sos = _designBandpass(order, lowcut, highcut, fs);
      this.channels = Array.from({ length: numChannels }, () => new BiquadCascade(sos));
    }
    process(channels) {
      const out = new Array(channels.length);
      for (let c = 0; c < channels.length; c++) {
        out[c] = this.channels[c] ? this.channels[c].process(channels[c]) : channels[c];
      }
      return out;
    }
  }

  class MultichannelNotch {
    constructor(numChannels, freq, q, fs) {
      const sos = [_designNotch(freq, q, fs)];
      this.channels = Array.from({ length: numChannels }, () => new BiquadCascade(sos));
    }
    process(channels) {
      const out = new Array(channels.length);
      for (let c = 0; c < channels.length; c++) {
        out[c] = this.channels[c] ? this.channels[c].process(channels[c]) : channels[c];
      }
      return out;
    }
  }

  const HAMPEL_MAD_SCALE = 1.4826;
  const HAMPEL_MIN_MAD = 2.0;

  class HampelFilter {
    constructor(numChannels, windowSize = 5, nSigma = 3.0, enabled = true) {
      this.numChannels = numChannels;
      this._windowSize = HampelFilter._normWindow(windowSize);
      this._nSigma = Math.max(1.0, nSigma);
      this.enabled = enabled;
      this.replacedCount = 0;
      this._initBuffers();
    }
    static _normWindow(w) {
      let ws = Math.max(3, Math.floor(w));
      if (ws % 2 === 0) ws += 1;
      return ws;
    }
    _initBuffers() {
      const ws = this._windowSize;
      this.buffers = Array.from({ length: this.numChannels }, () => new Float64Array(ws));
      this.heads = new Int32Array(this.numChannels);
      this.counts = new Int32Array(this.numChannels);
      this._scratch = new Float64Array(ws);
      this._devScratch = new Float64Array(ws);
    }
    get windowSize() { return this._windowSize; }
    set windowSize(value) {
      const ws = HampelFilter._normWindow(value);
      if (ws !== this._windowSize) {
        this._windowSize = ws;
        this.reset();
      }
    }
    get nSigma() { return this._nSigma; }
    set nSigma(value) { this._nSigma = Math.max(1.0, value); }
    reset() { this._initBuffers(); }

    apply(channels) {
      const n = Math.min(channels.length, this.numChannels);
      const ws = this._windowSize;
      if (!this.enabled) {
        for (let ch = 0; ch < n; ch++) {
          const head = this.heads[ch];
          this.buffers[ch][head] = channels[ch];
          this.heads[ch] = (head + 1) % ws;
          if (this.counts[ch] < ws) this.counts[ch]++;
        }
        return channels;
      }

      const result = channels.slice();
      const scratch = this._scratch;
      const devScratch = this._devScratch;

      for (let ch = 0; ch < n; ch++) {
        const buf = this.buffers[ch];
        const val = channels[ch];
        const count = this.counts[ch];

        if (count >= ws) {
          for (let i = 0; i < ws; i++) scratch[i] = buf[i];
          scratch.sort();
          const mid = ws >> 1;
          const median = scratch[mid];

          for (let i = 0; i < ws; i++) devScratch[i] = Math.abs(scratch[i] - median);
          devScratch.sort();
          const mad = devScratch[mid];

          const threshold = this._nSigma * HAMPEL_MAD_SCALE * Math.max(mad, HAMPEL_MIN_MAD);
          if (Math.abs(val - median) > threshold) {
            result[ch] = median;
            this.replacedCount++;
          }
        }

        const head = this.heads[ch];
        buf[head] = val;
        this.heads[ch] = (head + 1) % ws;
        if (count < ws) this.counts[ch] = count + 1;
      }
      return result;
    }
  }

  class DspChain {
    constructor(numChannels, sampleRate, config) {
      this.numChannels = numChannels;
      this.fs = sampleRate;
      this.bandpass = null;
      this.notch = null;
      this.bandpassEnabled = false;
      this.notchEnabled = false;
      this._bpLow = 1;
      this._bpHigh = 40;
      this._bpOrder = 5;
      this._notchFreq = 60;
      this._notchQ = 30;

      const h = config.hampel || {};
      this.hampel = new HampelFilter(
        numChannels,
        h.windowSize != null ? h.windowSize : 5,
        h.nSigma != null ? h.nSigma : 3.0,
        h.enabled !== false,
      );

      if (config.bandpass) {
        const b = config.bandpass;
        this.setBandpass(true, b.low != null ? b.low : 1, b.high != null ? b.high : 40,
          b.order != null ? b.order : 5);
      }
      if (config.notch) {
        const nf = config.notch;
        this.setNotch(true, nf.freq != null ? nf.freq : 60, nf.q != null ? nf.q : 30);
      }
    }
    setBandpass(enabled, lowcut, highcut, order) {
      if (lowcut != null) this._bpLow = lowcut;
      if (highcut != null) this._bpHigh = highcut;
      if (order != null) this._bpOrder = order;
      const valid = enabled && this._bpLow > 0 && this._bpHigh > this._bpLow
        && this._bpHigh < this.fs / 2;
      this.bandpass = valid
        ? new MultichannelBandpass(this.numChannels, this._bpLow, this._bpHigh, this.fs, this._bpOrder)
        : null;
      this.bandpassEnabled = valid;
    }
    setNotch(enabled, freq, q) {
      if (freq != null) this._notchFreq = freq;
      if (q != null) this._notchQ = q;
      const valid = enabled && this._notchFreq > 0 && this._notchFreq < this.fs / 2;
      this.notch = valid
        ? new MultichannelNotch(this.numChannels, this._notchFreq, this._notchQ, this.fs)
        : null;
      this.notchEnabled = valid;
    }
    setHampel(cfg) {
      if (cfg.enabled !== undefined) this.hampel.enabled = cfg.enabled;
      if (cfg.windowSize !== undefined) this.hampel.windowSize = cfg.windowSize;
      if (cfg.nSigma !== undefined) this.hampel.nSigma = cfg.nSigma;
    }
    config() {
      return {
        hampel: {
          enabled: this.hampel.enabled,
          windowSize: this.hampel.windowSize,
          nSigma: this.hampel.nSigma,
          replacedCount: this.hampel.replacedCount,
        },
        bandpass: this.bandpassEnabled
          ? { low: this._bpLow, high: this._bpHigh, order: this._bpOrder } : false,
        notch: this.notchEnabled ? { freq: this._notchFreq, q: this._notchQ } : false,
      };
    }
    process(channels) {
      let out = this.hampel.apply(channels);
      if (this.bandpass) out = this.bandpass.process(out);
      if (this.notch) out = this.notch.process(out);
      return out;
    }
  }

  function _resolveFilterConfig(option) {
    if (option === false || option === null) return null;
    const defaults = {
      hampel: { enabled: true, windowSize: 5, nSigma: 3.0 },
      bandpass: { low: 1, high: 40, order: 5 },
      notch: false,
    };
    if (option === undefined || option === true) return defaults;

    const cfg = {
      hampel: defaults.hampel,
      bandpass: defaults.bandpass,
      notch: defaults.notch,
    };
    if (option.hampel !== undefined) {
      cfg.hampel = option.hampel === false
        ? { enabled: false }
        : { ...defaults.hampel, ...option.hampel };
    }
    if (option.bandpass !== undefined) {
      cfg.bandpass = option.bandpass === false ? false
        : { ...defaults.bandpass, ...option.bandpass };
    }
    if (option.notch !== undefined) {
      if (option.notch === false) cfg.notch = false;
      else if (typeof option.notch === 'number') cfg.notch = { freq: option.notch, q: 30 };
      else cfg.notch = { freq: 60, q: 30, ...option.notch };
    }
    return cfg;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Serial Frame Parser (IronBCI-32)
  // ═══════════════════════════════════════════════════════════════════════════

  class SerialFrameParser {
    constructor(numChannels = SERIAL_NUM_CHANNELS) {
      this.numChannels = numChannels;
      this.rxBuffer = [];
      this.frameSize = null;
      this.droppedBytes = 0;
    }

    detectFrameSize(buf) {
      const starts = [];
      for (let i = 1; i < buf.length; i++) {
        if (buf[i] === SERIAL_START_BYTE && buf[i - 1] === SERIAL_END_BYTE) {
          starts.push(i);
          if (starts.length >= 3) {
            const dLast = starts[starts.length - 1] - starts[starts.length - 2];
            const dPrev = starts[starts.length - 2] - starts[starts.length - 3];
            if (dLast === dPrev && dLast >= 99 && dLast <= 131) {
              return dLast;
            }
          }
        }
      }
      return null;
    }

    decodeFrame(frame) {
      const channels = new Array(this.numChannels);
      const base = 2;
      for (let ch = 0; ch < this.numChannels; ch++) {
        const off = base + ch * 3;
        let raw = (frame[off] << 16) | (frame[off + 1] << 8) | frame[off + 2];
        if (raw & AD7771_SIGN_BIT) raw -= 16777216;
        const uv = (AD7771_VREF / AD7771_FULL_SCALE / AD7771_GAIN) * raw * 1000000;
        channels[ch] = Math.round(uv * 100) / 100;
      }
      return { channels, counter: frame[1] };
    }

    push(chunk, onSample) {
      for (let i = 0; i < chunk.length; i++) {
        this.rxBuffer.push(chunk[i]);
      }
      if (this.rxBuffer.length > 16384) {
        this.rxBuffer.splice(0, this.rxBuffer.length - 8192);
      }

      if (this.frameSize === null) {
        this.frameSize = this.detectFrameSize(this.rxBuffer);
        if (this.frameSize === null) return;
      }

      let start = -1;
      for (let i = 0; i < this.rxBuffer.length; i++) {
        if (this.rxBuffer[i] === SERIAL_START_BYTE &&
            (i === 0 || this.rxBuffer[i - 1] === SERIAL_END_BYTE)) {
          start = i;
          break;
        }
      }
      if (start < 0) return;
      if (start > 0) this.rxBuffer.splice(0, start);

      while (this.frameSize && this.rxBuffer.length >= this.frameSize) {
        if (this.rxBuffer[0] !== SERIAL_START_BYTE ||
            this.rxBuffer[this.frameSize - 1] !== SERIAL_END_BYTE) {
          this.droppedBytes++;
          this.rxBuffer.splice(0, 1);
          if (this.droppedBytes % 64 === 0) this.frameSize = null;
          break;
        }
        const frame = this.rxBuffer.slice(0, this.frameSize);
        this.rxBuffer.splice(0, this.frameSize);
        try {
          const decoded = this.decodeFrame(frame);
          onSample(decoded.channels, Date.now() / 1000, decoded.counter);
        } catch {
          this.droppedBytes++;
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Sample Decoders
  // ═══════════════════════════════════════════════════════════════════════════

  function decodeAds1299(bytes, channels) {
    const VREF = 4.5;
    const FULL_SCALE = 0xffffff;
    const SIGN_BIT = 0x800000;
    const bytesPerSample = channels * 3;
    const count = Math.floor(bytes.length / bytesPerSample);
    const samples = [];
    for (let s = 0; s < count; s++) {
      const base = s * bytesPerSample;
      const out = new Array(channels);
      for (let ch = 0; ch < channels; ch++) {
        const off = base + ch * 3;
        let raw = (bytes[off] << 16) | (bytes[off + 1] << 8) | bytes[off + 2];
        if (raw >= SIGN_BIT) raw -= FULL_SCALE + 1;
        out[ch] = Math.round((1000000 * VREF * (raw / FULL_SCALE)) * 100) / 100;
      }
      samples.push({ channels: out, counter: null });
    }
    return samples;
  }

  /**
   * Decode Octopus 16 51-byte BLE notifications:
   *   [0]      = 0xA0 start marker
   *   [1]      = 0..255 packet counter
   *   [2..25]  = ADC1 ch 1..8  (8 × 3B big-endian signed 24-bit)
   *   [26..49] = ADC2 ch 9..16 (8 × 3B big-endian signed 24-bit)
   *   [50]     = 0xC0 end marker
   */
  function decodeAds131m08(bytes, channels) {
    const FULL_SCALE = 0xffffff;
    const SIGN_BIT = 0x800000;
    const PACKET = 51, START = 0xA0, END = 0xC0, DATA_OFFSET = 2;
    if (bytes.length < PACKET) return [];
    const samples = [];
    for (let base = 0; base + PACKET <= bytes.length; base += PACKET) {
      if (bytes[base] !== START || bytes[base + PACKET - 1] !== END) break;
      const counter = bytes[base + 1];
      const out = new Array(channels);
      for (let ch = 0; ch < channels; ch++) {
        const off = base + DATA_OFFSET + ch * 3;
        let raw = (bytes[off] << 16) | (bytes[off + 1] << 8) | bytes[off + 2];
        if (raw >= SIGN_BIT) raw -= FULL_SCALE + 1;
        out[ch] = Math.round((raw * OCTOPUS16_UV_SCALE) * 100) / 100;
      }
      samples.push({ channels: out, counter });
    }
    return samples;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Device Registry
  // ═══════════════════════════════════════════════════════════════════════════

  const IRONBCI_BLE = {
    service: '0000fe40-cc7a-482a-984a-7f2ed5b3e58f',
    notifyChar: '0000fe42-8e22-4541-9d4c-21edae82ed19',
    filters: [
      { namePrefix: 'EAREEG' },
      { namePrefix: 'IronBCI' },
      { namePrefix: 'IRONBCI' },
    ],
  };

  const DEVICES = {
    'ironbci-8': {
      label: 'IronBCI-8',
      transport: 'ble',
      channels: 8,
      sampleRate: 250,
      ble: IRONBCI_BLE,
      decode: decodeAds1299,
    },
    'ironbci-16': {
      label: 'IronBCI-16',
      transport: 'ble',
      channels: 16,
      sampleRate: 250,
      ble: IRONBCI_BLE,
      decode: decodeAds1299,
    },
    'octopus-16': {
      label: 'Octopus 16',
      transport: 'ble',
      channels: 16,
      sampleRate: OCTOPUS16_NOMINAL_SPS,
      ble: {
        service: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
        notifyChar: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',
        cmdChar: 'c0de0001-36e1-4688-b7f5-ea07361b26a8',
        filters: [
          { services: ['4fafc201-1fb5-459e-8fcc-c5c9c331914b'] },
          { namePrefix: 'Octopus' },
          { namePrefix: 'Octopos' },
          { namePrefix: 'bioron' },
          { namePrefix: 'PiEEG' },
        ],
      },
      decode: decodeAds131m08,
    },
    'ironbci-32': {
      label: 'IronBCI-32',
      transport: 'serial',
      channels: 32,
      sampleRate: 500,
      serial: { baudRate: SERIAL_BAUD_RATE },
    },
  };

  const DEFAULT_BLE_DEVICE = 'ironbci-8';
  const DEFAULT_SERIAL_DEVICE = 'ironbci-32';

  function deviceIdsByTransport(transport) {
    return Object.keys(DEVICES).filter((id) => DEVICES[id].transport === transport);
  }

  function resolveDevice(id, transport) {
    const descriptor = DEVICES[id];
    if (!descriptor || (transport && descriptor.transport !== transport)) {
      const known = transport ? deviceIdsByTransport(transport).join(', ') : Object.keys(DEVICES).join(', ');
      throw new Error(`Unknown ${transport || ''} device "${id}". Available: ${known}.`);
    }
    return descriptor;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Main PiEEG Class
  // ═══════════════════════════════════════════════════════════════════════════

  class PiEEG {
    constructor(options = {}) {
      this.options = {
        fftSize: options.fftSize || FFT_SIZE,
        updateHz: options.updateHz || 15,
        bufferSeconds: options.bufferSeconds || 4,
        ...options,
      };

      this._filterConfig = _resolveFilterConfig(options.filter);
      this._dsp = null;

      // Connection state
      this.device = null;
      this.port = null;
      this.connected = false;
      this.deviceId = null;
      this.deviceType = null; // 'ble' | 'serial' | 'simulator'
      this.numChannels = 0;
      this.sampleRate = 0;
      this._decode = null;

      // Buffers & FFT
      this.channelBuffers = [];
      this.fftEngine = null;
      this.updateTimer = null;

      // Simulator state
      this._simTimer = null;
      this._simState = {
        alphaBoost: false,
        blinkUntil: 0,
        clenchUntil: 0,
        noisyPinIndex: -1,
        ssvepHz: 0,
      };

      // Callbacks
      this.onDataCallback = null;
      this.onBandPowersCallback = null;
      this.onErrorCallback = null;
      this.onDisconnectCallback = null;

      // BLE listener refs
      this._bleOnValueChanged = null;
      this._bleOnDisconnect = null;

      // Telemetry & Statistics
      this.samplesReceived = 0;
      this.packetsLost = 0;
      this._lastCounter = null;
      this._rateWindowStart = 0;
      this._rateWindowSamples = 0;
      this.measuredHz = 0;
      this.lastBandPowers = null;
      this.lastChannelBandPowers = null;
      this.lastSpectrum = null;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Connection Methods
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Connect a Bluetooth (Web Bluetooth) board. Must be called from a user gesture.
     * @param {Object} [options]
     * @param {string} [options.device='octopus-16'] Registry key ('octopus-16', 'ironbci-8', 'ironbci-16')
     */
    async connectBLE(options = {}) {
      if (!isWebBluetoothSupported()) {
        throw new Error('Web Bluetooth not supported. Use Chrome/Edge over HTTPS or localhost.');
      }

      this.disconnect();

      const id = options.device || DEFAULT_BLE_DEVICE;
      const descriptor = resolveDevice(id, 'ble');
      const ble = descriptor.ble;

      const device = await navigator.bluetooth.requestDevice({
        filters: ble.filters,
        optionalServices: [ble.service],
      });

      if (!device.gatt) {
        throw new Error('Selected BLE device does not expose a GATT server.');
      }

      const server = await device.gatt.connect();

      let characteristic = null;
      try {
        const service = await server.getPrimaryService(ble.service);
        characteristic = await service.getCharacteristic(ble.notifyChar);
      } catch {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          const chars = await service.getCharacteristics();
          const found = chars.find((c) => c.uuid === ble.notifyChar);
          if (found) {
            characteristic = found;
            break;
          }
        }
      }

      if (!characteristic) {
        throw new Error(`${descriptor.label} notify characteristic (${ble.notifyChar}) not found.`);
      }

      this.device = device;
      this.characteristic = characteristic;
      this.deviceId = id;
      this.deviceType = 'ble';
      this.numChannels = descriptor.channels;
      this.sampleRate = descriptor.sampleRate;
      this._decode = descriptor.decode;

      this._initBuffers();

      const onValueChanged = (event) => {
        const value = event.target.value;
        if (!value) return;
        const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        const samples = this._decode(bytes, this.numChannels);
        const t = Date.now() / 1000;
        for (let i = 0; i < samples.length; i++) {
          this._ingestSample(samples[i].channels, t, samples[i].counter);
        }
      };

      const onDisconnect = () => {
        this.connected = false;
        if (this.onDisconnectCallback) this.onDisconnectCallback();
      };

      this._bleOnValueChanged = onValueChanged;
      this._bleOnDisconnect = onDisconnect;
      device.addEventListener('gattserverdisconnected', onDisconnect);
      characteristic.addEventListener('characteristicvaluechanged', onValueChanged);
      await characteristic.startNotifications();

      this.connected = true;
      this._startProcessing();

      return {
        device: id,
        deviceName: device.name || descriptor.label,
        channels: this.numChannels,
        sampleRate: this.sampleRate,
        transport: 'ble',
      };
    }

    /**
     * Connect a Web Serial board (e.g., IronBCI-32). Must be called from a user gesture.
     */
    async connectSerial(options = {}) {
      if (!isWebSerialSupported()) {
        throw new Error('Web Serial not supported. Use Chrome/Edge over HTTPS or localhost.');
      }

      this.disconnect();

      const id = options.device || DEFAULT_SERIAL_DEVICE;
      const descriptor = resolveDevice(id, 'serial');

      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: descriptor.serial.baudRate });

      const reader = port.readable.getReader();
      const parser = new SerialFrameParser(descriptor.channels);

      this.port = port;
      this.reader = reader;
      this.deviceId = id;
      this.deviceType = 'serial';
      this.numChannels = descriptor.channels;
      this.sampleRate = descriptor.sampleRate;

      this._initBuffers();

      const readLoop = async () => {
        try {
          while (this.connected) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value && value.length) {
              parser.push(value, (channels, t, counter) => this._ingestSample(channels, t, counter));
            }
          }
        } catch (err) {
          if (this.onErrorCallback) this.onErrorCallback(err);
        } finally {
          if (this.connected) {
            this.connected = false;
            if (this.onDisconnectCallback) this.onDisconnectCallback();
          }
        }
      };

      this.connected = true;
      this._startProcessing();
      readLoop();

      return {
        device: id,
        deviceName: descriptor.label,
        channels: this.numChannels,
        sampleRate: this.sampleRate,
        transport: 'serial',
      };
    }

    /**
     * Start a realistic 16-channel 250 Hz synthetic Octopus 16 simulator.
     * Ideal for hackathon teams developing UI/games/ML pipelines without hardware attached.
     *
     * @param {Object} [options]
     * @param {string} [options.device='octopus-16'] Device profile to emulate
     */
    async connectSimulator(options = {}) {
      this.disconnect();

      const id = options.device || 'octopus-16';
      const descriptor = DEVICES[id] || DEVICES['octopus-16'];

      this.deviceId = id;
      this.deviceType = 'simulator';
      this.numChannels = descriptor.channels;
      this.sampleRate = descriptor.sampleRate;

      this._initBuffers();
      this.connected = true;
      this._startProcessing();

      let sampleIdx = 0;
      let counter = 0;
      const fs = this.sampleRate;
      const batchIntervalMs = 16; // emit ~4 samples every 16 ms for realistic BLE timing
      let lastTick = performance.now();

      this._simTimer = setInterval(() => {
        if (!this.connected) return;
        const now = performance.now();
        const elapsedSec = Math.min(0.1, (now - lastTick) / 1000);
        lastTick = now;

        const samplesToEmit = Math.max(1, Math.round(elapsedSec * fs));
        const wallTimeSec = Date.now() / 1000;

        for (let s = 0; s < samplesToEmit; s++) {
          const t = sampleIdx / fs;
          sampleIdx++;
          const frame = new Array(this.numChannels);

          const alphaAmp = this._simState.alphaBoost ? 34.0 : 5.5;
          const isBlinking = now < this._simState.blinkUntil;
          const isClenching = now < this._simState.clenchUntil;
          const ssvepHz = this._simState.ssvepHz;

          // Shared cortical rhythms across the 20x20 mm pogo cluster with subtle spatial gradient
          const baseDelta = 7.0 * Math.sin(2 * Math.PI * 2.2 * t);
          const baseTheta = 5.0 * Math.sin(2 * Math.PI * 6.1 * t + 0.7);
          const baseAlpha = alphaAmp * Math.sin(2 * Math.PI * 10.2 * t + 0.3 * Math.sin(2 * Math.PI * 0.4 * t));
          const baseBeta  = (this._simState.alphaBoost ? 3.5 : 8.5) * Math.sin(2 * Math.PI * 20.5 * t + 1.4);
          const ssvepSig  = ssvepHz > 0 ? 18.0 * Math.sin(2 * Math.PI * ssvepHz * t) : 0;

          // Blink waveform (half-sine ~180 µV spike)
          let blinkWave = 0;
          if (isBlinking) {
            const rem = (this._simState.blinkUntil - now) / 220; // 0..1
            blinkWave = 175.0 * Math.sin(Math.PI * (1 - rem));
          }

          for (let ch = 0; ch < this.numChannels; ch++) {
            const pin = OCTOPUS_16_PINS[ch] || { x: 0, y: 0 };
            // Spatial phase/amplitude gradient across the 26 mm array
            const spatialGain = 1.0 + (pin.y / 45.0) + (pin.x / 80.0);
            const pinkNoise = (Math.random() - 0.5) * 4.5 + (Math.random() - 0.5) * 4.5;

            let uv = (baseDelta + baseTheta + baseAlpha + baseBeta + ssvepSig) * spatialGain + pinkNoise;

            if (isBlinking) {
              // Stronger on anterior pins (higher y)
              uv += blinkWave * (1.0 + pin.y / 30.0);
            }
            if (isClenching) {
              // High-frequency 35-85 Hz sEMG burst
              uv += (Math.random() - 0.5) * 140.0;
            }
            if (this._simState.noisyPinIndex === ch) {
              // Simulate a poorly seated pogo pin with 50 Hz mains + drift
              uv += 240.0 * Math.sin(2 * Math.PI * 50 * t) + (Math.random() - 0.5) * 90;
            }

            frame[ch] = Math.round(uv * 100) / 100;
          }

          this._ingestSample(frame, wallTimeSec, counter);
          counter = (counter + 1) & 0xff;
        }
      }, batchIntervalMs);

      return {
        device: id,
        deviceName: `${descriptor.label} (250 Hz Simulator)`,
        channels: this.numChannels,
        sampleRate: this.sampleRate,
        transport: 'simulator',
      };
    }

    /**
     * Inject synthetic physiological or hardware events into the active simulator.
     *
     * @param {'alpha'|'blink'|'clench'|'noisy_pin'|'ssvep'} type
     * @param {boolean|number} [value]
     */
    triggerSimEvent(type, value) {
      const now = performance.now();
      switch (type) {
        case 'alpha':
          this._simState.alphaBoost = value !== undefined ? Boolean(value) : !this._simState.alphaBoost;
          return this._simState.alphaBoost;
        case 'blink':
          this._simState.blinkUntil = now + (typeof value === 'number' ? value : 220);
          return true;
        case 'clench':
          this._simState.clenchUntil = now + (typeof value === 'number' ? value : 650);
          return true;
        case 'noisy_pin':
          this._simState.noisyPinIndex = typeof value === 'number'
            ? value
            : (this._simState.noisyPinIndex >= 0 ? -1 : 3);
          return this._simState.noisyPinIndex;
        case 'ssvep':
          this._simState.ssvepHz = typeof value === 'number' ? value : 0;
          return this._simState.ssvepHz;
        default:
          return null;
      }
    }

    disconnect() {
      this.connected = false;

      if (this.updateTimer) {
        clearInterval(this.updateTimer);
        this.updateTimer = null;
      }

      if (this._simTimer) {
        clearInterval(this._simTimer);
        this._simTimer = null;
      }

      if (this.deviceType === 'ble') {
        if (this.characteristic) {
          if (this._bleOnValueChanged) {
            this.characteristic.removeEventListener('characteristicvaluechanged', this._bleOnValueChanged);
          }
          if (this.device && this._bleOnDisconnect) {
            this.device.removeEventListener('gattserverdisconnected', this._bleOnDisconnect);
          }
          this._bleOnValueChanged = null;
          this._bleOnDisconnect = null;
          this.characteristic.stopNotifications().catch(() => {});
          if (this.device?.gatt?.connected) {
            this.device.gatt.disconnect();
          }
        }
      } else if (this.deviceType === 'serial') {
        if (this.reader) {
          const reader = this.reader;
          reader.cancel().catch(() => {}).finally(() => {
            try { reader.releaseLock(); } catch { /* ignore */ }
          });
        }
        if (this.port) {
          this.port.close().catch(() => {});
        }
      }

      this.device = null;
      this.port = null;
      this.deviceId = null;
      this.deviceType = null;
      this._decode = null;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Event Listeners
    // ═════════════════════════════════════════════════════════════════════════

    onData(callback) { this.onDataCallback = callback; }
    onBandPowers(callback) { this.onBandPowersCallback = callback; }
    onError(callback) { this.onErrorCallback = callback; }
    onDisconnect(callback) { this.onDisconnectCallback = callback; }

    // ═════════════════════════════════════════════════════════════════════════
    // Filtering (Runtime Control of the Browser-Side DSP Chain)
    // ═════════════════════════════════════════════════════════════════════════

    setBandpass(enabled, lowcut, highcut, order) {
      if (this._dsp) this._dsp.setBandpass(enabled, lowcut, highcut, order);
    }

    setNotch(enabled, freq, q) {
      if (this._dsp) this._dsp.setNotch(enabled, freq, q);
    }

    setHampel(config) {
      if (this._dsp) this._dsp.setHampel(config || {});
    }

    getFilterConfig() {
      return this._dsp ? this._dsp.config() : null;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Spatial & Pogo-Pin Contact Helpers (Octopus 16 Specific)
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Compute per-channel RMS amplitude in µV over the latest `windowSamples` (default 0.5 s).
     * @returns {number[]} Array of RMS values (µV) per channel
     */
    getChannelRMS(windowSamples = 125) {
      const out = new Array(this.numChannels);
      for (let ch = 0; ch < this.numChannels; ch++) {
        out[ch] = this.channelBuffers[ch] ? this.channelBuffers[ch].computeRms(windowSamples) : 0;
      }
      return out;
    }

    /**
     * Evaluate pogo-pin scalp contact quality per channel.
     *   - 'good':   2.0 µV <= RMS <= 150.0 µV (clean physiological contact)
     *   - 'railed': RMS > 150.0 µV (poor pin contact, hair blocking pin, or motion artifact)
     *   - 'flat':   RMS < 2.0 µV (ADC not converting or shorted pin)
     */
    getContactQuality(windowSamples = 125) {
      const rmsList = this.getChannelRMS(windowSamples);
      return rmsList.map((rms, index) => {
        const status = rms < 2.0 ? 'flat' : rms > 150.0 ? 'railed' : 'good';
        return {
          channel: index + 1,
          rms: Math.round(rms * 10) / 10,
          status,
          pin: OCTOPUS_16_PINS[index] || null,
        };
      });
    }

    /**
     * Apply a local hexagonal Surface Laplacian (Current Source Density) spatial filter
     * across a 16-channel Octopus 16 sample vector:
     *   Laplacian[ch] = V[ch] - mean(V[nearest_hex_neighbors])
     * Suppresses common-mode reference drift and sharpens local cortical activity.
     *
     * @param {number[]} channels 16-channel sample array in µV
     * @returns {number[]} Spatially filtered 16-channel array in µV
     */
    computeLaplacian(channels) {
      if (!channels || channels.length < 16) return channels;
      const out = new Array(channels.length);
      for (let i = 0; i < 16; i++) {
        const nbrs = OCTOPUS_16_NEIGHBORS[i];
        if (!nbrs || nbrs.length === 0) {
          out[i] = channels[i];
          continue;
        }
        let sum = 0;
        for (let k = 0; k < nbrs.length; k++) {
          sum += channels[nbrs[k]];
        }
        out[i] = channels[i] - sum / nbrs.length;
      }
      return out;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Spectral & Band-Power Ratio Helpers
    // ═════════════════════════════════════════════════════════════════════════

    getRelaxationIndex() {
      if (!this.lastBandPowers) return 0;
      const alpha = this.lastBandPowers.Alpha || 0;
      const beta = this.lastBandPowers.Beta || 0;
      const sum = alpha + beta;
      return sum > 0 ? alpha / sum : 0.5;
    }

    getFocusIndex() {
      if (!this.lastBandPowers) return 0;
      const beta = this.lastBandPowers.Beta || 0;
      const theta = this.lastBandPowers.Theta || 0;
      const sum = beta + theta;
      return sum > 0 ? beta / sum : 0.5;
    }

    getMeditationIndex() {
      if (!this.lastBandPowers) return 0;
      const theta = this.lastBandPowers.Theta || 0;
      const alpha = this.lastBandPowers.Alpha || 0;
      let total = 0;
      for (const band of FREQUENCY_BANDS) {
        total += this.lastBandPowers[band.name] || 0;
      }
      return total > 0 ? (theta + alpha) / total : 0;
    }

    isFocused(threshold = 0.6) {
      return this.getFocusIndex() > threshold;
    }

    isRelaxed(threshold = 0.6) {
      return this.getRelaxationIndex() > threshold;
    }

    getBandPower(bandName) {
      if (!this.lastBandPowers) return 0;
      return this.lastBandPowers[bandName] || 0;
    }

    getBandPowers() {
      return this.lastBandPowers ? { ...this.lastBandPowers } : null;
    }

    getChannelBandPowers() {
      return this.lastChannelBandPowers ? this.lastChannelBandPowers.slice() : null;
    }

    getSpectrum() {
      return this.lastSpectrum ? { ...this.lastSpectrum } : null;
    }

    getStats() {
      const totalPackets = this.samplesReceived + this.packetsLost;
      return {
        connected: this.connected,
        device: this.deviceId,
        deviceLabel: this.deviceId && DEVICES[this.deviceId] ? DEVICES[this.deviceId].label : null,
        deviceType: this.deviceType,
        numChannels: this.numChannels,
        sampleRate: this.sampleRate,
        measuredHz: Math.round(this.measuredHz * 10) / 10,
        samplesReceived: this.samplesReceived,
        packetsLost: this.packetsLost,
        packetLossRate: totalPackets > 0 ? this.packetsLost / totalPackets : 0,
        bufferFill: this.channelBuffers.length > 0
          ? this.channelBuffers[0].count / this.channelBuffers[0].size
          : 0,
      };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Internal Methods
    // ═════════════════════════════════════════════════════════════════════════

    _initBuffers() {
      const bufferSize = Math.ceil(this.sampleRate * this.options.bufferSeconds);
      this.channelBuffers = [];
      for (let i = 0; i < this.numChannels; i++) {
        this.channelBuffers.push(new RingBuffer(bufferSize));
      }
      this.fftEngine = new FFTEngine(this.options.fftSize, this.sampleRate);
      this._dsp = this._filterConfig
        ? new DspChain(this.numChannels, this.sampleRate, this._filterConfig)
        : null;
      this.samplesReceived = 0;
      this.packetsLost = 0;
      this._lastCounter = null;
      this._rateWindowStart = performance.now();
      this._rateWindowSamples = 0;
      this.measuredHz = 0;
    }

    _ingestSample(channels, timestamp, counter) {
      // Track BLE / serial packet counter (0..255) for dropped packets
      if (typeof counter === 'number') {
        if (this._lastCounter !== null) {
          const expected = (this._lastCounter + 1) & 0xff;
          if (counter !== expected) {
            const gap = (counter - expected + 256) & 0xff;
            if (gap < 128) this.packetsLost += gap;
          }
        }
        this._lastCounter = counter;
      }

      // Measure actual sample rate over ~1 s rolling windows
      this._rateWindowSamples++;
      const now = performance.now();
      const elapsed = now - this._rateWindowStart;
      if (elapsed >= 1000) {
        const instHz = (this._rateWindowSamples * 1000) / elapsed;
        this.measuredHz = this.measuredHz === 0 ? instHz : this.measuredHz * 0.7 + instHz * 0.3;
        this._rateWindowStart = now;
        this._rateWindowSamples = 0;
      }

      if (this._dsp) channels = this._dsp.process(channels);

      for (let i = 0; i < this.numChannels && i < channels.length; i++) {
        this.channelBuffers[i].push(channels[i]);
      }
      this.samplesReceived++;

      if (this.onDataCallback) {
        try {
          this.onDataCallback(channels, timestamp);
        } catch (err) {
          if (this.onErrorCallback) this.onErrorCallback(err);
        }
      }
    }

    _startProcessing() {
      if (this.updateTimer) {
        clearInterval(this.updateTimer);
        this.updateTimer = null;
      }

      const intervalMs = Math.round(1000 / this.options.updateHz);

      this.updateTimer = setInterval(() => {
        if (!this.connected) return;

        const sumBandPowers = {};
        for (const band of FREQUENCY_BANDS) {
          sumBandPowers[band.name] = 0;
        }

        let validChannels = 0;
        let avgPsd = null;
        let freqs = null;
        let dominantFreq = 0;
        let maxPeak = 0;
        const perChannelPowers = new Array(this.numChannels);

        for (let ch = 0; ch < this.numChannels; ch++) {
          const result = this.fftEngine.analyseRing(this.channelBuffers[ch]);
          if (result) {
            validChannels++;
            perChannelPowers[ch] = result.bandPowers;
            freqs = result.freqs;
            if (!avgPsd) {
              avgPsd = new Float64Array(result.psd.length);
            }
            for (let k = 0; k < result.psd.length; k++) {
              avgPsd[k] += result.psd[k];
            }
            for (const band of FREQUENCY_BANDS) {
              sumBandPowers[band.name] += result.bandPowers[band.name];
            }
          } else {
            perChannelPowers[ch] = null;
          }
        }

        if (validChannels > 0) {
          const avgBandPowers = {};
          let totalPower = 0;
          for (const band of FREQUENCY_BANDS) {
            const val = sumBandPowers[band.name] / validChannels;
            avgBandPowers[band.name] = val;
            totalPower += val;
          }

          if (avgPsd && freqs) {
            for (let k = 0; k < avgPsd.length; k++) {
              avgPsd[k] /= validChannels;
              if (k > 0 && avgPsd[k] > maxPeak) {
                maxPeak = avgPsd[k];
                dominantFreq = freqs[k];
              }
            }
          }

          this.lastBandPowers = avgBandPowers;
          this.lastChannelBandPowers = perChannelPowers;
          this.lastSpectrum = {
            psd: avgPsd,
            freqs,
            bandPowers: avgBandPowers,
            totalPower,
            dominantFreq,
          };

          if (this.onBandPowersCallback) {
            try {
              this.onBandPowersCallback(avgBandPowers, this.lastSpectrum);
            } catch (err) {
              if (this.onErrorCallback) this.onErrorCallback(err);
            }
          }
        }
      }, intervalMs);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Static Exports
  // ═══════════════════════════════════════════════════════════════════════════

  PiEEG.VERSION = VERSION;
  PiEEG.isWebBluetoothSupported = isWebBluetoothSupported;
  PiEEG.isWebSerialSupported = isWebSerialSupported;
  PiEEG.FREQUENCY_BANDS = FREQUENCY_BANDS;
  PiEEG.OCTOPUS_16_PINS = OCTOPUS_16_PINS;
  PiEEG.OCTOPUS_16_NEIGHBORS = OCTOPUS_16_NEIGHBORS;
  PiEEG.OCTOPUS16_UV_SCALE = OCTOPUS16_UV_SCALE;
  PiEEG.OCTOPUS16_LEDC8MHZ_SPS = OCTOPUS16_LEDC8MHZ_SPS;

  PiEEG.devices = function (transport) {
    const ids = transport ? deviceIdsByTransport(transport) : Object.keys(DEVICES);
    return ids.map((id) => {
      const d = DEVICES[id];
      return {
        id,
        label: d.label,
        transport: d.transport,
        channels: d.channels,
        sampleRate: d.sampleRate,
      };
    });
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PiEEG;
  } else {
    global.PiEEG = PiEEG;
  }

})(typeof window !== 'undefined' ? window : this);
