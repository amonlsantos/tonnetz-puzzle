import { TestBed } from '@angular/core/testing';
import { PitchDetectionService } from './pitch-detection.service';
import type { PitchDetectionConfig } from '../models/instrument-mode.model';

const DEFAULT_CONFIG: PitchDetectionConfig = {
  fftSize: 2048,
  clarityThreshold: 0.9,
  stabilityFrames: 3,
  hysteresisCents: 50,
};

const mockStream = { getTracks: () => [] } as unknown as MediaStream;

describe('PitchDetectionService', () => {
  let service: PitchDetectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PitchDetectionService);
  });

  afterEach(() => {
    service.stopDetection();
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('frequencyToPitchClass', () => {
    it('should convert 440Hz to pitchClass 9 (A)', () => {
      expect(service.frequencyToPitchClass(440)).toBe(9);
    });

    it('should convert 261.63Hz to pitchClass 0 (C4)', () => {
      expect(service.frequencyToPitchClass(261.63)).toBe(0);
    });

    it('should convert 293.66Hz to pitchClass 2 (D4)', () => {
      expect(service.frequencyToPitchClass(293.66)).toBe(2);
    });

    it('should convert 329.63Hz to pitchClass 4 (E4)', () => {
      expect(service.frequencyToPitchClass(329.63)).toBe(4);
    });

    it('should handle octaves correctly (same pitchClass)', () => {
      const c4 = service.frequencyToPitchClass(261.63);
      const c5 = service.frequencyToPitchClass(523.25);
      expect(c4).toBe(c5);
    });

    it('should return 0 for frequency 0', () => {
      expect(service.frequencyToPitchClass(0)).toBe(0);
    });

    it('should return 0 for negative frequency', () => {
      expect(service.frequencyToPitchClass(-100)).toBe(0);
    });

    it('should handle very high frequency (C8 = 4186 Hz)', () => {
      expect(service.frequencyToPitchClass(4186)).toBe(0);
    });

    it('should handle very low frequency (C1 = 32.7 Hz)', () => {
      expect(service.frequencyToPitchClass(32.7)).toBe(0);
    });
  });

  describe('startDetection', () => {
    it('should set up audio context and analyser', () => {
      const closeCb = vi.fn().mockResolvedValue(undefined);
      const getFloatTimeDomainData = vi.fn();
      const analyserMock = {
        fftSize: 0,
        smoothingTimeConstant: 0,
        getFloatTimeDomainData,
      };
      const sourceMock = {
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      const createMediaStreamSource = vi.fn().mockReturnValue(sourceMock);
      const createAnalyser = vi.fn().mockReturnValue(analyserMock);

      class MockAudioContext {
        sampleRate = 48000;
        createMediaStreamSource = createMediaStreamSource;
        createAnalyser = createAnalyser;
        close = closeCb;
      }
      vi.stubGlobal('AudioContext', MockAudioContext);

      const source = service.startDetection(mockStream, DEFAULT_CONFIG);
      expect(source).toBeTruthy();

      // Verificar wiring do pipeline: stream → analyser, fftSize configurado
      expect(createMediaStreamSource).toHaveBeenCalledWith(mockStream);
      expect(createAnalyser).toHaveBeenCalledOnce();
      expect(analyserMock.fftSize).toBe(DEFAULT_CONFIG.fftSize);
      expect(sourceMock.connect).toHaveBeenCalledWith(analyserMock);

      service.stopDetection();
      expect(sourceMock.disconnect).toHaveBeenCalled();
      expect(closeCb).toHaveBeenCalled();
      vi.unstubAllGlobals();
    });
  });
});