import { TUNING_LIST } from './tunings';

/**
 * Classe Tune: calcula desvio em cents e nomes de notas.
 *
 * Portada do pacote npm `tune.js` (MIT) - apenas o core necessário para
 * o afinador. O pacote original (~1.2MB) foi reduzido para ~10KB vendorando
 * apenas a classe Tune e o temperamento igual.
 *
 * O desvio em cents é derivado da matemática MIDI (equivalente a
 * `1200 * log2(freq/target)` do tune.js): como o temperamento igual divide
 * a oitava em 12 passos idênticos de 100 cents, basta medir a diferença
 * entre a nota MIDI fracionária e a nota MIDI arredondada (a nota alvo).
 *
 * Fonte original: https://github.com/fustkilas/tune.js (MIT License)
 * Copyright (c) 2016 Fust Kilas
 */
export class Tune {
  constructor(
    private readonly tuningName: keyof typeof TUNING_LIST = 'equal',
    private readonly reference: number = 440
  ) {}

  /**
   * Calcula o desvio em cents entre a frequência detectada e a nota alvo
   * mais próxima do temperamento.
   *
   * Fórmula: cents = (MIDI - round(MIDI)) * 100
   * Onde 100 cents = 1 semitom; positivo = agudo, negativo = grave.
   *
   * @param frequency Frequência em Hz
   * @returns Desvio em cents da nota mais próxima
   */
  tune(frequency: number): number {
    if (frequency <= 0) {
      return 0;
    }
    const midi = this.ftom(frequency);
    return (midi - Math.round(midi)) * 100;
  }

  /**
   * Converte frequência para número de nota MIDI fracionário.
   *
   * MIDI note 69 = A4 (440 Hz)
   * Fórmula: 69 + 12 * log2(freq / 440)
   *
   * @param frequency Frequência em Hz
   * @returns Número de nota MIDI (pode ser fracionário)
   */
  ftom(frequency: number): number {
    if (frequency <= 0) {
      return 0;
    }
    return 69 + 12 * Math.log2(frequency / this.reference);
  }

  /**
   * Retorna o nome da nota a partir do número MIDI.
   *
   * Usa grafia com bemóis (Db, Eb, Gb, Ab, Bb) seguindo a convenção
   * de intervalos musicais (jugado na decisão #10 do modo instrumento).
   *
   * @param midiNote Número de nota MIDI
   * @returns Nome da nota (C, Db, D, Eb, E, F, Gb, G, Ab, A, Bb, B)
   */
  getNoteName(midiNote: number): string {
    const names = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    const pitchClass = Math.round(midiNote) % 12;
    const normalizedClass = pitchClass < 0 ? pitchClass + 12 : pitchClass;
    return names[normalizedClass];
  }
}

/**
 * Mapeamento de nomes de notas em inglês para português.
 */
export const NOTE_NAMES_PT: Record<string, string> = {
  'C': 'Dó',
  'Db': 'Réb',
  'D': 'Ré',
  'Eb': 'Mib',
  'E': 'Mi',
  'F': 'Fá',
  'Gb': 'Solb',
  'G': 'Sol',
  'Ab': 'Láb',
  'A': 'Lá',
  'Bb': 'Sib',
  'B': 'Si',
};