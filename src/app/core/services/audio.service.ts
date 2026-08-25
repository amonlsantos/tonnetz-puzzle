import { Injectable } from '@angular/core';
import * as Tone from 'tone';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private synth: Tone.PolySynth | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.setupSynth();
  }

  private setupSynth(): void {
    this.synth = new Tone.PolySynth(Tone.Synth, {
      envelope: {
        attack: 0.005,
        decay: 1.4,
        sustain: 0.0,
        release: 1.2,
      },
      oscillator: {
        type: 'triangle',
      },
      volume: -6,
    }).toDestination();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = Tone.start().then(() => {
      this.isInitialized = true;
      console.log('Audio context initialized');
    });

    return this.initializationPromise;
  }

  async playNote(noteWithOctave: string, duration: string = '4n'): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.synth) {
      console.error('Synth not initialized');
      return;
    }

    try {
      // Para todas as notas anteriores antes de tocar a nova
      this.synth.releaseAll();
      
      // Toca a nova nota
      this.synth.triggerAttackRelease(noteWithOctave, duration);
    } catch (error) {
      console.error('Error playing note:', error);
    }
  }

  async playChord(notes: string[], duration: string = '2n'): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.synth) {
      console.error('Synth not initialized');
      return;
    }

    try {
      this.synth.triggerAttackRelease(notes, duration);
    } catch (error) {
      console.error('Error playing chord:', error);
    }
  }

  stopAll(): void {
    if (this.synth) {
      this.synth.releaseAll();
    }
  }

  dispose(): void {
    if (this.synth) {
      this.synth.dispose();
      this.synth = null;
    }
    this.isInitialized = false;
    this.initializationPromise = null;
  }
}
