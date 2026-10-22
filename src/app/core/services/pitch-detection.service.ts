import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { PitchDetector } from 'pitchy';
import type { PitchDetectionConfig } from '../models/instrument-mode.model';

/**
 * Resultado de uma detecção de pitch.
 */
export interface PitchDetectionResult {
  /** Frequência fundamental em Hz (0 se sem sinal) */
  frequency: number;
  /** Clareza/confiança da detecção (0-1) */
  clarity: number;
}

/**
 * Serviço de detecção de altura (pitch) usando pitchy (McLeod Pitch Method).
 *
 * Conecta um MediaStream ao Web Audio API, processa o sinal via AnalyserNode,
 * e detecta a frequência fundamental em tempo real usando requestAnimationFrame.
 */
@Injectable({
  providedIn: 'root',
})
export class PitchDetectionService implements OnDestroy {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private detector: PitchDetector<Float32Array> | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private rafId: number | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  ngOnDestroy(): void {
    this.stopDetection();
  }

  /**
   * Inicia detecção contínua de pitch do stream.
   *
   * Retorna Observable que emite { frequency, clarity } a cada frame (~60fps).
   * O Observable completa automaticamente quando stopDetection() é chamado.
   *
   * @param stream MediaStream do microfone
   * @param config Configuração de detecção (fftSize, clarityThreshold, etc)
   */
  startDetection(
    stream: MediaStream,
    config: PitchDetectionConfig
  ): Observable<PitchDetectionResult> {
    // 1. Criar AudioContext se não existe
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    // 2. Conectar stream → analyser
    this.sourceNode = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = config.fftSize;
    this.analyser.smoothingTimeConstant = 0; // Sem smoothing - queremos dados brutos
    this.sourceNode.connect(this.analyser);

    // 3. Criar detector do pitchy
    this.detector = PitchDetector.forFloat32Array(config.fftSize);
    this.detector.clarityThreshold = config.clarityThreshold;
    this.buffer = new Float32Array(config.fftSize);
    // 4. Loop de detecção via requestAnimationFrame
    return new Observable<PitchDetectionResult>(observer => {
      const loop = () => {
        if (!this.analyser || !this.detector || !this.buffer) {
          observer.complete();
          return;
        }

        // Copiar dados do domínio do tempo
        this.analyser.getFloatTimeDomainData(this.buffer);

        // Detectar pitch
        const [frequency, clarity] = this.detector.findPitch(
          this.buffer,
          this.audioContext!.sampleRate
        );

        observer.next({ frequency, clarity });

        // Agendar próximo frame
        this.rafId = requestAnimationFrame(loop);
      };

      // Iniciar loop
      loop();

      // Cleanup ao unsubscribe
      return () => {
        if (this.rafId !== null) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
      };
    });
  }

  /**
   * Para o loop de detecção e libera recursos do AudioContext.
   */
  stopDetection(): void {
    // Cancelar requestAnimationFrame
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Desconectar source
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    // Limpar referências
    this.analyser = null;
    this.detector = null;
    this.buffer = null;

    // Fechar AudioContext
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Converte frequência em Hz para classe de altura (0-11).
   *
   * Usa fórmula MIDI: note = 69 + 12 * log2(freq / 440)
   * onde 69 = A4 (440 Hz), pitchClass = note % 12.
   *
   * @param frequency Frequência em Hz
   * @returns Classe de altura (0=C, 1=C#, ..., 11=B)
   */
  frequencyToPitchClass(frequency: number): number {
    if (frequency <= 0) {
      return 0;
    }

    const midiNote = 69 + 12 * Math.log2(frequency / 440);
    const pitchClass = Math.round(midiNote) % 12;

    // Garantir resultado positivo (% em JS pode retornar negativo)
    return pitchClass < 0 ? pitchClass + 12 : pitchClass;
  }
}
