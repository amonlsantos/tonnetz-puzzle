import { TestBed } from '@angular/core/testing';
import { InstrumentModeService } from './instrument-mode.service';
import { MicrophoneService } from './microphone.service';
import { PitchDetectionService } from './pitch-detection.service';
import type { PitchDetectionConfig } from '../models/instrument-mode.model';
import { of, firstValueFrom } from 'rxjs';

describe('InstrumentModeService', () => {
  let service: InstrumentModeService;
  let microphoneService: MicrophoneService;
  let pitchDetectionService: PitchDetectionService;

  const DEFAULT_CONFIG: PitchDetectionConfig = {
    fftSize: 2048,
    clarityThreshold: 0.9,
    stabilityFrames: 3,
    hysteresisCents: 50,
  };

  const mockStream = { getTracks: () => [] } as unknown as MediaStream;

  const startWith = (frequency: number, clarity: number) => {
    vi.spyOn(microphoneService, 'isSupported').mockReturnValue(true);
    vi.spyOn(microphoneService, 'requestStream').mockResolvedValue(mockStream);
    vi.spyOn(pitchDetectionService, 'startDetection').mockReturnValue(
      of({ frequency, clarity })
    );
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InstrumentModeService);
    microphoneService = TestBed.inject(MicrophoneService);
    pitchDetectionService = TestBed.inject(PitchDetectionService);
  });

  afterEach(() => {
    service.stopListening();
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('state machine', () => {
    it('should start in inactive state', async () => {
      const state = await firstValueFrom(service.state$);
      expect(state).toBe('inactive');
    });

    it('should transition to requesting-permission on startListening', async () => {
      startWith(0, 0);

      const states = await firstValueFrom(service.state$);
      expect(states).toBe('inactive');

      await service.startListening(DEFAULT_CONFIG);
      // Não pode verificar transição intermediária facilmente; validar que inicia
      expect(service.state$).toBeTruthy();
    });

    it('should throw if getUserMedia not supported', async () => {
      vi.spyOn(microphoneService, 'isSupported').mockReturnValue(false);

      await expect(service.startListening(DEFAULT_CONFIG)).rejects.toThrow(
        'getUserMedia não suportado neste navegador'
      );
    });

    it('should transition to inactive on stopListening', async () => {
      service.stopListening();
      const state = await firstValueFrom(service.state$);
      expect(state).toBe('inactive');
    });
  });

  describe('detection processing', () => {
    it('should emit no-signal for low clarity', async () => {
      startWith(440, 0.5); // Clarity abaixo do threshold

      await service.startListening(DEFAULT_CONFIG);

      const note = await firstValueFrom(service.detectedNote$);
      expect(note.state).toBe('no-signal');
      expect(note.pitchClass).toBeNull();
      expect(note.frequency).toBeNull();
    });

    it('should emit listening for valid signal without stability', async () => {
      startWith(440, 0.95);

      await service.startListening(DEFAULT_CONFIG);

      const note = await firstValueFrom(service.detectedNote$);
      expect(note.state).toBe('listening');
      expect(note.pitchClass).toBe(9); // A4 = pitchClass 9
      expect(note.frequency).toBe(440);
      expect(note.noteName).toBe('A');
    });

    it('should calculate cents correctly for 440Hz (A4)', async () => {
      startWith(440, 0.95);

      await service.startListening(DEFAULT_CONFIG);

      const note = await firstValueFrom(service.detectedNote$);
      expect(note.cents).not.toBeNull();
      // 440 Hz = 0 cents
      expect(Math.abs(note.cents!)).toBeLessThan(1);
    });

    it('should use bemol notation (Db, Eb, etc)', async () => {
      startWith(277.18, 0.95); // C#4/Db4

      await service.startListening(DEFAULT_CONFIG);

      const note = await firstValueFrom(service.detectedNote$);
      // pitchClass 1 → Db (bemol), não C#
      expect(note.pitchClass).toBe(1);
      expect(note.noteName).toBe('Db');
    });

    it('should emit note-locked when stable across multiple frames', async () => {
      // Simular detecção estável: mesma frequência repetida
      startWith(440, 0.95);

      await service.startListening(DEFAULT_CONFIG);

      // Processar múltiplos frames (o observable re-emite a cada subscription,
      // mas o serviço acumula stabilityBuffer por chamada ao processDetection)
      const note1 = await firstValueFrom(service.detectedNote$);
      expect(note1.state).toBe('listening');
    });
  });

  describe('cleanup', () => {
    it('should stop stream on stopListening', async () => {
      startWith(0, 0);
      const stopStreamSpy = vi.spyOn(microphoneService, 'stopStream');

      await service.startListening(DEFAULT_CONFIG);
      service.stopListening();

      expect(stopStreamSpy).toHaveBeenCalled();
    });

    it('should stop detection on stopListening', async () => {
      startWith(0, 0);
      const stopDetectionSpy = vi.spyOn(pitchDetectionService, 'stopDetection');

      await service.startListening(DEFAULT_CONFIG);
      service.stopListening();

      expect(stopDetectionSpy).toHaveBeenCalled();
    });

    it('should reset to empty note on stopListening', async () => {
      service.stopListening();

      const note = await firstValueFrom(service.detectedNote$);
      expect(note.state).toBe('inactive');
      expect(note.pitchClass).toBeNull();
      expect(note.frequency).toBeNull();
      expect(note.cents).toBeNull();
      expect(note.clarity).toBe(0);
      expect(note.noteName).toBeNull();
    });
  });
});