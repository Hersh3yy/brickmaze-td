// Lightweight Web Audio API procedural sound effects for tactile plastic brick & arcade feedback

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(val: boolean): void {
    this.muted = val;
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainPeak = 0.08,
    delay = 0
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playBrickSnap() {
    // Crisp plastic click + hollow resonant pop
    this.tone(420, 180, 0.055, 'square', 0.06, 0);
    this.tone(760, 520, 0.04, 'triangle', 0.07, 0.015);
  }

  public playInvalid() {
    this.tone(170, 110, 0.14, 'sawtooth', 0.06, 0);
  }

  public playKeepBrick() {
    this.tone(523.25, 523.25, 0.08, 'triangle', 0.08, 0);
    this.tone(659.25, 783.99, 0.14, 'triangle', 0.08, 0.06);
  }

  public playFuseMaster() {
    this.tone(440, 440, 0.09, 'triangle', 0.08, 0);
    this.tone(554.37, 554.37, 0.09, 'triangle', 0.08, 0.07);
    this.tone(659.25, 880, 0.22, 'sine', 0.1, 0.14);
  }

  public playPlaceTower() {
    this.tone(300, 620, 0.09, 'square', 0.05, 0);
    this.tone(880, 740, 0.06, 'triangle', 0.06, 0.05);
  }

  public playRelocate() {
    this.tone(480, 700, 0.08, 'sine', 0.07, 0);
    this.tone(700, 560, 0.07, 'triangle', 0.06, 0.06);
  }

  public playUpgrade() {
    this.tone(523.25, 659.25, 0.09, 'triangle', 0.07, 0);
    this.tone(783.99, 1046.5, 0.15, 'triangle', 0.07, 0.07);
  }

  public playSell() {
    this.tone(640, 380, 0.11, 'triangle', 0.06, 0);
  }

  public playWaveStart() {
    this.tone(261.63, 261.63, 0.12, 'sawtooth', 0.045, 0);
    this.tone(329.63, 392.0, 0.22, 'sawtooth', 0.045, 0.1);
  }

  public playShoot(pitchFactor = 1) {
    this.tone(520 * pitchFactor, 220 * pitchFactor, 0.045, 'square', 0.022, 0);
  }

  public playLifeLost() {
    this.tone(220, 95, 0.22, 'sawtooth', 0.07, 0);
  }

  public playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.tone(n, n, 0.18, 'triangle', 0.08, idx * 0.1);
    });
  }

  public playDefeat() {
    const notes = [392.0, 349.23, 311.13, 261.63];
    notes.forEach((n, idx) => {
      this.tone(n, n * 0.94, 0.22, 'sawtooth', 0.05, idx * 0.14);
    });
  }
}

export const soundEngine = new SoundEngine();
