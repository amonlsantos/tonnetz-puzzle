import { TestBed } from '@angular/core/testing';
import { MicrophoneService } from './microphone.service';

describe('MicrophoneService', () => {
  let service: MicrophoneService;

  function stubMediaDevices(getUserMediaImpl = vi.fn()) {
    const mediaDevices = { getUserMedia: getUserMediaImpl } as unknown as MediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: mediaDevices,
      configurable: true,
      writable: true,
    });
    return mediaDevices;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MicrophoneService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isSupported', () => {
    it('should return true if getUserMedia is available', () => {
      stubMediaDevices();
      expect(service.isSupported()).toBe(true);
    });

    it('should return false if navigator.mediaDevices is undefined', () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        configurable: true,
      });
      expect(service.isSupported()).toBe(false);
    });
  });

  describe('requestStream', () => {
    it('should request stream with correct constraints', async () => {
      const mockStream = { getTracks: () => [] } as unknown as MediaStream;
      const getUserMediaSpy = vi.fn().mockResolvedValue(mockStream);
      stubMediaDevices(getUserMediaSpy);

      const stream = await service.requestStream();

      expect(getUserMediaSpy).toHaveBeenCalledWith({
        audio: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
          channelCount: 1,
        },
        video: false,
      });
      expect(stream).toBe(mockStream);
    });

    it('should throw if getUserMedia rejects with NotAllowedError', async () => {
      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';
      stubMediaDevices(vi.fn().mockRejectedValue(error));

      await expect(service.requestStream()).rejects.toThrow('Permission denied');
    });

    it('should throw error if getUserMedia is not supported', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        configurable: true,
      });

      await expect(service.requestStream()).rejects.toThrow(
        'getUserMedia não suportado neste navegador'
      );
    });
  });

  describe('stopStream', () => {
    it('should stop all tracks in the stream', () => {
      const track1 = { stop: vi.fn() } as unknown as MediaStreamTrack;
      const track2 = { stop: vi.fn() } as unknown as MediaStreamTrack;
      const mockStream = {
        getTracks: () => [track1, track2],
      } as unknown as MediaStream;

      service.stopStream(mockStream);

      expect(track1.stop).toHaveBeenCalledOnce();
      expect(track2.stop).toHaveBeenCalledOnce();
    });

    it('should handle empty stream gracefully', () => {
      const mockStream = {
        getTracks: () => [],
      } as unknown as MediaStream;

      expect(() => service.stopStream(mockStream)).not.toThrow();
    });
  });
});