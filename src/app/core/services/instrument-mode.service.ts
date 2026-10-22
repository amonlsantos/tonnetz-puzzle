import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MicrophoneService } from './microphone.service';
import { PitchDetectionService } from './pitch-detection.service';
import { Tune } from '../vendor/tune/tune';
import type {
  InstrumentModeState,
  DetectedNote,
  PitchDetectionConfig,
} from '../models/instrument-mode.model';

/**
 * Serviço orchestrador do modo instrumento.
 *
 * Gerencia o ciclo de vida completo do pipeline: microfone → detecção →
 * conversão para nota → emissão de estado. Implementa state machine com
 * lógica de estabilidade (múltiplos frames com mesma classe de altura antes
 * de travar a nota).
 */
@Injectable({
  providedIn: 'root',
})
export class InstrumentModeService implements OnDestroy {
  private readonly stateSubject = new BehaviorSubject<InstrumentModeState>('inactive');
  private readonly detectedNoteSubject = new BehaviorSubject<DetectedNote>(this.emptyNote());
  private readonly destroy$ = new Subject<void>();

  private currentStream: MediaStream | null = null;
  private readonly tuner = new Tune('equal', 440);
  private stabilityBuffer: number[] = [];

  /** Observable do estado atual do modo instrumento */
  readonly state$ = this.stateSubject.asObservable();

  /** Observable da nota detectada (atualiza a cada frame) */
  readonly detectedNote$ = this.detectedNoteSubject.asObservable();

  constructor(
    private readonly microphone: MicrophoneService,
    private readonly pitchDetection: PitchDetectionService
  ) {}

  ngOnDestroy(): void {
    this.stopListening();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicia o modo instrumento: solicita permissão de microfone e inicia
   * o loop de detecção.
   *
   * @throws Error se permissão for negada ou navegador não suportar getUserMedia
   */
  async startListening(config: PitchDetectionConfig): Promise<void> {
    // 1. Verificar suporte
    if (!this.microphone.isSupported()) {
      throw new Error('getUserMedia não suportado neste navegador');
    }

    // 2. Request permission
    this.stateSubject.next('requesting-permission');

    try {
      this.currentStream = await this.microphone.requestStream();
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        this.stateSubject.next('permission-denied');
      }
      throw error;
    }

    // 3. Start detection loop
    const detection$ = this.pitchDetection.startDetection(this.currentStream, config);

    detection$.pipe(takeUntil(this.destroy$)).subscribe({
      next: result => this.processDetection(result.frequency, result.clarity, config),
      error: error => {
        console.error('Pitch detection error:', error);
        this.stopListening();
      },
    });
  }

  /**
   * Para o modo instrumento: para stream, detecção e reseta estado.
   */
  stopListening(): void {
    if (this.currentStream) {
      this.microphone.stopStream(this.currentStream);
      this.currentStream = null;
    }

    this.pitchDetection.stopDetection();
    this.stabilityBuffer = [];
    this.stateSubject.next('inactive');
    this.detectedNoteSubject.next(this.emptyNote());
  }

  /**
   * Processa um frame de detecção e atualiza estado + nota detectada.
   */
  private processDetection(
    frequency: number,
    clarity: number,
    config: PitchDetectionConfig
  ): void {
    // 1. Sem sinal claro
    if (clarity < config.clarityThreshold || frequency === 0) {
      this.stateSubject.next('no-signal');
      this.stabilityBuffer = [];
      this.detectedNoteSubject.next({
        state: 'no-signal',
        pitchClass: null,
        frequency: null,
        cents: null,
        clarity,
        noteName: null,
      });
      return;
    }

    // 2. Sinal válido - calcular dados da nota
    const pitchClass = this.pitchDetection.frequencyToPitchClass(frequency);
    const cents = this.tuner.tune(frequency);
    const midiNote = this.tuner.ftom(frequency);
    const noteName = this.tuner.getNoteName(midiNote);

    // 3. Estabilidade: buffer de frames consecutivos com mesma pitchClass
    this.stabilityBuffer.push(pitchClass);
    if (this.stabilityBuffer.length > config.stabilityFrames) {
      this.stabilityBuffer.shift();
    }

    // 4. Verificar se todos os frames no buffer são iguais
    const allSame = this.stabilityBuffer.every(pc => pc === pitchClass);
    const isStable =
      allSame && this.stabilityBuffer.length === config.stabilityFrames;

    const state: InstrumentModeState = isStable ? 'note-locked' : 'listening';

    this.stateSubject.next(state);
    this.detectedNoteSubject.next({
      state,
      pitchClass,
      frequency,
      cents,
      clarity,
      noteName,
    });
  }

  /**
   * Retorna nota vazia (estado inicial/resetado).
   */
  private emptyNote(): DetectedNote {
    return {
      state: 'inactive',
      pitchClass: null,
      frequency: null,
      cents: null,
      clarity: 0,
      noteName: null,
    };
  }
}
