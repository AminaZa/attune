/**
 * CABIN AUDIO ENGINE — the Web Audio graph behind the "quiet the cabin, keep the
 * siren" showpiece (`src/features/audio/`, lead). Pure audio: no React, no store.
 * The `Audio` component owns the lifecycle and binds it to store decisions.
 *
 * Graph:
 *
 *   droneSource ─▶ lowpass ─▶ droneGain ─┐
 *                                        ├─▶ master ─▶ destination
 *   sirenSource ─▶ sirenGain ────────────┘
 *                          └─▶ analyser   (side tap — read, not heard)
 *
 * As `noiseCancelLevel` rises we duck `droneGain` (to ~10%) and close the
 * low-pass — the judge HEARS the fatiguing drone fall away. The siren rides its
 * own gain at full volume, unaffected by cancellation, so it punches through.
 * The analyser taps the siren layer so we can HONESTLY detect the siren live
 * (an oscillating spectral peak in 600–1500 Hz) rather than hardcoding the cue.
 */

const DRONE_SRC = '/audio/cabin-drone.mp3';
const SIREN_SRC = '/audio/siren.mp3';

/** Short spoken cues, played at full gain (never ducked) on the driver's voice channel. */
const VOICE_SRCS: Record<string, string> = {
  stress: '/audio/voice-stress.mp3', // gentle_cue
  stressFirm: '/audio/voice-stress-firm.mp3', // firm_cue (escalation)
  attention: '/audio/voice-attention.mp3', // re-engagement
  siren: '/audio/voice-siren.mp3', // emergency vehicle
};

/** Drone ducking + filter targets at full cancellation. */
const DRONE_MIN_GAIN = 0.02; // ~2% — barely-there hush, but never a full mute (it's the cabin)
const LOWPASS_OPEN_HZ = 20000; // effectively bypassed
const LOWPASS_CLOSED_HZ = 150; // deeply muffled, "underwater" cabin at max calming
const RAMP_TC = 0.35; // setTargetAtTime time-constant — smooth, never a click

/**
 * Duck-response curve. `noiseCancelLevel` (= the engine's `overload`) rarely
 * reaches 1.0 in the demo — stress peaks ~0.55, siren ~0.76 — so a linear duck
 * would barely move. We bend the response so it ducks HARD across the range the
 * scenarios actually hit (near-full by ~0.65), making the suppression clearly
 * audible, while calm (~0.1) leaves the drone mostly present for contrast.
 */
const DUCK_KNEE = 0.65; // level at which the duck is effectively maxed
const DUCK_EXP = 0.7; // <1 → ducks early/aggressively within the knee

/** Siren detection band + thresholds (the honest "we detect it" check). */
const BAND_LO_HZ = 600;
const BAND_HI_HZ = 1500;
const DETECT_DB = -72; // band energy above this counts as "present"
const WARBLE_HZ = 70; // peak must wander at least this much → oscillating siren, not a tone
const HISTORY = 24; // ~1s of peak-frequency history at the analysis cadence

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export interface AudioStatus {
  droneGain: number;
  lowpassHz: number;
  sirenPlaying: boolean;
  sirenDetected: boolean;
  detectPeakHz: number;
  mode: 'processed' | 'raw';
  muted: boolean;
}

export class CabinAudioEngine {
  private ctx: AudioContext;
  private master: GainNode;
  private lowpass: BiquadFilterNode;
  private droneGain: GainNode;
  private sirenGain: GainNode;
  private voiceGain: GainNode;
  private analyser: AnalyserNode;

  private droneBuffer: AudioBuffer | null = null;
  private sirenBuffer: AudioBuffer | null = null;
  private droneSource: AudioBufferSourceNode | null = null;
  private sirenSource: AudioBufferSourceNode | null = null;
  private voiceBuffers: Record<string, AudioBuffer> = {};
  private voiceSource: AudioBufferSourceNode | null = null;

  private freqData: Float32Array<ArrayBuffer>;
  private peakHistory: number[] = [];
  private bandLoBin: number;
  private bandHiBin: number;

  private noiseCancelLevel = 0;
  private mode: 'processed' | 'raw' = 'processed';
  private muted = false;
  private sirenPlaying = false;
  private sirenDetected = false;
  private detectPeakHz = 0;

  constructor() {
    this.ctx = new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    this.master = this.ctx.createGain();
    this.lowpass = this.ctx.createBiquadFilter();
    this.droneGain = this.ctx.createGain();
    this.sirenGain = this.ctx.createGain();
    this.voiceGain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();

    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = LOWPASS_OPEN_HZ;
    this.droneGain.gain.value = 1;
    this.sirenGain.gain.value = 1;
    this.voiceGain.gain.value = 1;
    this.master.gain.value = 1;
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.6;

    // Drone chain: source → lowpass → droneGain → master
    this.lowpass.connect(this.droneGain);
    this.droneGain.connect(this.master);
    // Siren chain: source → sirenGain → master, with a read-only analyser tap.
    this.sirenGain.connect(this.master);
    this.sirenGain.connect(this.analyser);
    // Voice chain: one-shot cues → voiceGain → master (full gain, never ducked).
    this.voiceGain.connect(this.master);
    this.master.connect(this.ctx.destination);

    this.freqData = new Float32Array(this.analyser.frequencyBinCount);
    const binHz = this.ctx.sampleRate / this.analyser.fftSize;
    this.bandLoBin = Math.max(1, Math.floor(BAND_LO_HZ / binHz));
    this.bandHiBin = Math.min(this.analyser.frequencyBinCount - 1, Math.ceil(BAND_HI_HZ / binHz));
  }

  /**
   * Load both clips and start the looping drone. Must be called from a user
   * gesture (browser autoplay policy). Throws if a clip is missing/undecodable —
   * the component surfaces that as an "assets missing" state and the app is fine.
   */
  async enable(): Promise<void> {
    await this.ctx.resume();
    if (!this.droneBuffer || !this.sirenBuffer) {
      [this.droneBuffer, this.sirenBuffer] = await Promise.all([
        this.loadBuffer(DRONE_SRC),
        this.loadBuffer(SIREN_SRC),
      ]);
    }
    // Voice clips are an enhancement — load best-effort so a missing/undecodable
    // clip never blocks the core "duck the drone, keep the siren" showpiece.
    await Promise.all(
      Object.entries(VOICE_SRCS).map(async ([key, url]) => {
        if (this.voiceBuffers[key]) return;
        try {
          this.voiceBuffers[key] = await this.loadBuffer(url);
        } catch {
          /* clip missing — that cue just stays silent */
        }
      })
    );
    this.startDrone();
    this.applyDroneTargets();
  }

  private async loadBuffer(url: string): Promise<AudioBuffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`audio fetch failed: ${url} (${res.status})`);
    const data = await res.arrayBuffer();
    return await this.ctx.decodeAudioData(data);
  }

  private startDrone(): void {
    if (this.droneSource || !this.droneBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.droneBuffer;
    src.loop = true;
    src.connect(this.lowpass);
    src.start();
    this.droneSource = src;
  }

  /** Drive the cabin-calming from the engine's `decisions.noiseCancelLevel`. */
  setNoiseCancel(level: number): void {
    this.noiseCancelLevel = clamp01(level);
    this.applyDroneTargets();
  }

  /** A/B toggle: processed (ducking applied) vs raw (the untouched soundscape). */
  setMode(mode: 'processed' | 'raw'): void {
    this.mode = mode;
    this.applyDroneTargets();
  }

  setMute(muted: boolean): void {
    this.muted = muted;
    this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
  }

  /** The bent duck-response: 0 (no cancelling) → 1 (full duck), maxed by the knee. */
  private duckAmount(): number {
    return clamp01(Math.pow(clamp01(this.noiseCancelLevel / DUCK_KNEE), DUCK_EXP));
  }

  /** Recompute drone gain + low-pass cutoff from level (or bypass them in raw mode). */
  private applyDroneTargets(): void {
    const amt = this.duckAmount();
    const gain = this.mode === 'raw' ? 1 : lerp(1, DRONE_MIN_GAIN, amt);
    const cutoff = this.mode === 'raw' ? LOWPASS_OPEN_HZ : lerp(LOWPASS_OPEN_HZ, LOWPASS_CLOSED_HZ, amt);
    const now = this.ctx.currentTime;
    this.droneGain.gain.setTargetAtTime(gain, now, RAMP_TC);
    // Filter sweeps exponentially — set as a target on a positive value.
    this.lowpass.frequency.setTargetAtTime(cutoff, now, RAMP_TC);
  }

  /**
   * Play a short spoken cue once (stress / stressFirm / attention / siren). Routed
   * at full gain, never ducked. A new cue cancels any still-playing one so lines
   * never overlap. No-op if the clip wasn't loaded.
   */
  playVoice(key: string): void {
    const buffer = this.voiceBuffers[key];
    if (!buffer) return;
    if (this.voiceSource) {
      try {
        this.voiceSource.stop();
      } catch {
        /* already finished */
      }
      this.voiceSource.disconnect();
      this.voiceSource = null;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.voiceGain);
    src.onended = () => {
      src.disconnect();
      if (this.voiceSource === src) this.voiceSource = null;
    };
    src.start();
    this.voiceSource = src;
  }

  /** Start the siren loop at full gain, unaffected by cancellation. */
  startSiren(): void {
    if (this.sirenPlaying || !this.sirenBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.sirenBuffer;
    src.loop = true;
    src.connect(this.sirenGain);
    this.sirenGain.gain.setValueAtTime(1, this.ctx.currentTime);
    src.start();
    this.sirenSource = src;
    this.sirenPlaying = true;
  }

  stopSiren(): void {
    if (this.sirenSource) {
      try {
        this.sirenSource.stop();
      } catch {
        /* already stopped */
      }
      this.sirenSource.disconnect();
      this.sirenSource = null;
    }
    this.sirenPlaying = false;
    this.sirenDetected = false;
    this.detectPeakHz = 0;
    this.peakHistory = [];
  }

  /**
   * Run the live frequency-pattern check on the siren layer. Reads the FFT, finds
   * the loudest bin in 600–1500 Hz, and reports a detection only when that band
   * carries real energy AND its peak is *oscillating* over the last ~1s (a siren
   * warbles; a steady tone or road noise does not). Call this each animation frame.
   */
  analyse(): void {
    if (!this.sirenPlaying) return;
    this.analyser.getFloatFrequencyData(this.freqData);

    let peakDb = -Infinity;
    let peakBin = this.bandLoBin;
    for (let b = this.bandLoBin; b <= this.bandHiBin; b++) {
      if (this.freqData[b] > peakDb) {
        peakDb = this.freqData[b];
        peakBin = b;
      }
    }
    const binHz = this.ctx.sampleRate / this.analyser.fftSize;
    const peakHz = peakBin * binHz;
    this.detectPeakHz = peakHz;

    this.peakHistory.push(peakHz);
    if (this.peakHistory.length > HISTORY) this.peakHistory.shift();

    const present = peakDb > DETECT_DB;
    const warble = Math.max(...this.peakHistory) - Math.min(...this.peakHistory);
    this.sirenDetected = present && this.peakHistory.length >= HISTORY / 2 && warble >= WARBLE_HZ;
  }

  status(): AudioStatus {
    return {
      droneGain: this.mode === 'raw' ? 1 : lerp(1, DRONE_MIN_GAIN, this.duckAmount()),
      lowpassHz: this.lowpass.frequency.value,
      sirenPlaying: this.sirenPlaying,
      sirenDetected: this.sirenDetected,
      detectPeakHz: this.detectPeakHz,
      mode: this.mode,
      muted: this.muted,
    };
  }

  /** Tear down the whole graph (HMR / unmount). */
  dispose(): void {
    this.stopSiren();
    if (this.voiceSource) {
      try {
        this.voiceSource.stop();
      } catch {
        /* already finished */
      }
      this.voiceSource.disconnect();
      this.voiceSource = null;
    }
    if (this.droneSource) {
      try {
        this.droneSource.stop();
      } catch {
        /* already stopped */
      }
      this.droneSource.disconnect();
      this.droneSource = null;
    }
    void this.ctx.close();
  }
}
