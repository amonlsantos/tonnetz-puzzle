import { Injectable } from '@angular/core';

/**
 * Serviço para captura de áudio do microfone via Web Audio API.
 *
 * Gerencia o ciclo de vida do MediaStream e aplica constraints adequadas
 * para detecção de pitch: mono, sem processamento (AGC/echo/noise off).
 */
@Injectable({
  providedIn: 'root',
})
export class MicrophoneService {
  /**
   * Constraints de áudio otimizadas para detecção de pitch.
   *
   * - autoGainControl: false → sinal puro sem normalização de volume
   * - echoCancellation: false → sem cancelamento que distorce harmônicos
   * - noiseSuppression: false → sem DSP que pode atrasar/alterar sinal
   * - channelCount: 1 → mono (instrumento monofônico)
   */
  private readonly AUDIO_CONSTRAINTS: MediaTrackConstraints = {
    autoGainControl: false,
    echoCancellation: false,
    noiseSuppression: false,
    channelCount: 1,
  };

  /**
   * Solicita permissão de microfone e retorna MediaStream.
   *
   * @throws NotAllowedError se usuário negar permissão
   * @throws NotFoundError se não houver microfone disponível
   * @throws NotSupportedError se navegador não suportar getUserMedia
   */
  async requestStream(): Promise<MediaStream> {
    if (!this.isSupported()) {
      throw new Error('getUserMedia não suportado neste navegador');
    }

    return navigator.mediaDevices.getUserMedia({
      audio: this.AUDIO_CONSTRAINTS,
      video: false,
    });
  }

  /**
   * Para o stream e libera todos os tracks (áudio).
   *
   * Deve ser chamado no cleanup para evitar leak de recursos e liberar
   * o microfone (luz vermelha/ícone continua aceso até chamar stop).
   */
  stopStream(stream: MediaStream): void {
    stream.getTracks().forEach(track => track.stop());
  }

  /**
   * Verifica se o navegador suporta getUserMedia.
   */
  isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
}
