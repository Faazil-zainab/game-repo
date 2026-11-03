"use client";

/**
 * Music + procedural engine/horn audio. Music is the CC0 track shipped with
 * Bruno Simon's folio-2025 repository, reused here with attribution.
 */
export class Soundscape {
  private music: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private muted = false;
  private started = false;

  start() {
    if (typeof window === "undefined") return;
    if (!this.music) {
      this.music = new Audio("/sites/bruno-simon/audio/baguira.mp3");
      this.music.loop = true;
      this.music.volume = 0.3;
      this.music.preload = "auto";
    }
    this.started = true;
    this.music.play().catch(() => undefined);
    this.initEngine();
    this.applyMute();
  }

  private initEngine() {
    if (this.ctx) {
      this.ctx.resume().catch(() => undefined);
      return;
    }
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = "sawtooth";
    oscillator.frequency.value = 48;
    filter.type = "lowpass";
    filter.frequency.value = 320;
    filter.Q.value = 4;
    gain.gain.value = 0;

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();

    this.ctx = ctx;
    this.engine = oscillator;
    this.engineGain = gain;
    this.filter = filter;
    ctx.resume().catch(() => undefined);
  }

  update(kmh: number) {
    if (!this.ctx || !this.engine || !this.engineGain || !this.filter) return;
    const t = this.ctx.currentTime;
    const speed = Math.min(kmh / 130, 1);
    this.engine.frequency.setTargetAtTime(46 + speed * 130, t, 0.08);
    this.filter.frequency.setTargetAtTime(240 + speed * 900, t, 0.1);
    this.engineGain.gain.setTargetAtTime(this.muted ? 0 : 0.012 + speed * 0.035, t, 0.12);
  }

  honk() {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = 392;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.34);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyMute();
  }

  private applyMute() {
    if (this.music) this.music.volume = this.muted ? 0 : 0.3;
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(this.muted ? 0 : 0.02, this.ctx.currentTime, 0.1);
    }
  }

  isMuted() {
    return this.muted;
  }

  dispose() {
    if (this.music) {
      this.music.pause();
      this.music.src = "";
      this.music = null;
    }
    if (this.engine) {
      this.engine.stop();
      this.engine.disconnect();
      this.engine = null;
    }
    this.engineGain?.disconnect();
    this.filter?.disconnect();
    this.engineGain = null;
    this.filter = null;
    if (this.ctx) {
      this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
    this.started = false;
  }

  isStarted() {
    return this.started;
  }
}
