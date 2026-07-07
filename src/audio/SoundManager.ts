/**
 * S4WN Audio System — Web Audio API Sound Manager
 *
 * Manages audio playback: loading, caching, and playing sound effects.
 * All sounds are procedurally generated; no original S4 assets.
 */

export class SoundManager {
  private context: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private masterGain: GainNode | null = null;
  private _muted: boolean = false;

  /** Lazily initialize AudioContext (must be called from user gesture). */
  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.masterGain.gain.value = this._muted ? 0 : 1;
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    return this.context;
  }

  /* ── Mute ────────────────────────────────────────────────── */

  get muted(): boolean { return this._muted; }

  toggleMute(): boolean {
    this._muted = !this._muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this._muted ? 0 : 1;
    }
    return this._muted;
  }

  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /* ── Loading ─────────────────────────────────────────────── */

  /** Load an audio file from a URL and cache it by name. */
  async load(name: string, url: string): Promise<void> {
    const ctx = this.ensureContext();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.buffers.set(name, audioBuffer);
  }

  /** Generate a simple synthetic beep/melody — no external files needed. */
  generateTone(name: string, frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    const ctx = this.ensureContext();
    const sampleRate = ctx.sampleRate;
    const length = Math.ceil(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.min(1, (length - i) / (sampleRate * 0.05)); // quick fade-out
      let sample = 0;
      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
          break;
        case 'triangle':
          sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
          break;
        case 'sawtooth':
          sample = 2 * (t * frequency - Math.floor(t * frequency)) - 1;
          break;
      }
      data[i] = sample * envelope * 0.3;
    }
    this.buffers.set(name, buffer);
  }

  /** Generate common game sounds procedurally. */
  generateDefaults(): void {
    this.generateTone('click', 800, 0.08, 'sine');
    this.generateTone('build', 440, 0.3, 'triangle');
    this.generateTone('destroy', 220, 0.4, 'sawtooth');
    this.generateTone('select', 660, 0.1, 'sine');
    this.generateTone('error', 200, 0.25, 'square');
    this.generateTone('complete', 523, 0.5, 'sine');  // C5
  }

  /* ── Playback ────────────────────────────────────────────── */

  play(name: string, volume: number = 1.0, loop: boolean = false): AudioBufferSourceNode | null {
    const ctx = this.ensureContext();
    const buffer = this.buffers.get(name);
    if (!buffer) {
      console.warn(`SoundManager: buffer "${name}" not found`);
      return null;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gainNode = ctx.createGain();
    gainNode.gain.value = Math.max(0, Math.min(1, volume));

    source.connect(gainNode);
    gainNode.connect(this.masterGain!);

    source.start();
    return source;
  }

  /** Check if a named buffer is loaded. */
  has(name: string): boolean {
    return this.buffers.has(name);
  }

  /** Number of loaded sound buffers. */
  get bufferCount(): number {
    return this.buffers.size;
  }

  /* ── Cleanup ─────────────────────────────────────────────── */

  dispose(): void {
    this.buffers.clear();
    if (this.context) {
      this.context.close();
      this.context = null;
      this.masterGain = null;
    }
  }
}

export const soundManager = new SoundManager();
