/**
 * Modelos de domínio do modo instrumento (navegação por microfone).
 *
 * O modo instrumento captura áudio do microfone, detecta a altura (pitch) da
 * nota tocada em um instrumento monofônico real, e move o cursor pela malha
 * para o nó correspondente à classe de altura detectada.
 */

/**
 * Estados do pipeline de detecção de pitch por microfone.
 */
export type InstrumentModeState =
  | 'inactive'              // Toggle OFF - modo instrumento desativado
  | 'requesting-permission' // Aguardando getUserMedia (permissão do usuário)
  | 'permission-denied'     // Microfone bloqueado pelo navegador
  | 'listening'             // Ouvindo, sem nota clara detectada
  | 'note-locked'           // Nota detectada e estável (pronta para movimento)
  | 'no-signal';            // Silêncio ou ruído (clarity abaixo do threshold)

/**
 * Nota detectada pelo pipeline de pitch detection.
 *
 * Combina o estado da detecção com os dados da nota reconhecida (frequência,
 * classe de altura, desvio em cents do temperamento igual, e clareza do sinal).
 */
export interface DetectedNote {
  /** Estado atual do pipeline */
  state: InstrumentModeState;

  /** Classe de altura (0-11, onde C=0), ou null se sem nota válida */
  pitchClass: number | null;

  /** Frequência fundamental detectada em Hz, ou null */
  frequency: number | null;

  /** Desvio em cents do temperamento igual, ou null */
  cents: number | null;

  /** Clareza/confiança da detecção (0-1, do pitchy MPM), sempre presente */
  clarity: number;

  /** Nome da nota (C, Db, D, ..., B) ou null. Usa bemóis. */
  noteName: string | null;
}

/**
 * Configuração do pipeline de detecção de altura.
 *
 * Define thresholds, tamanhos de buffer e critérios de estabilidade para
 * converter o fluxo contínuo do AnalyserNode em eventos discretos de nota.
 */
export interface PitchDetectionConfig {
  /**
   * Tamanho da janela FFT (potência de 2).
   * Maior = mais precisão em graves, mais latência.
   * Padrão: 2048 (~42ms @ 48kHz)
   */
  fftSize: 2048;

  /**
   * Threshold de clarity (0-1) para considerar sinal válido.
   * Abaixo deste valor, state = 'no-signal'.
   * Padrão: 0.9 (alta confiança)
   */
  clarityThreshold: number;

  /**
   * Número de frames consecutivos com a mesma pitchClass antes de travar
   * a nota (state = 'note-locked').
   * Maior = mais estável, menos responsivo.
   * Padrão: 3 frames (~60ms)
   */
  stabilityFrames: number;

  /**
   * Histerese de cents: quanto desvio tolerar sem soltar o lock de uma nota.
   * Uma vez travado, desvios menores que este valor não mudam a pitchClass.
   * Padrão: 50 cents (meio semitom)
   */
  hysteresisCents: number;
}
