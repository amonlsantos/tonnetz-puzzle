import type { TuningList } from './tune.model';

/**
 * Temperamento igual (12-EDO): 12 semitons com razão constante 2^(1/12).
 *
 * Este é o temperamento padrão moderno, onde todos os semitons têm a
 * mesma distância (100 cents) e qualquer tonalidade soa igualmente afinada.
 *
 * Razões calculadas: 2^(n/12) para n = 0..11
 */
export const EQUAL_TEMPERAMENT: number[] = [
  1.0,                    // 0: Tônica (C)
  1.0594630943592953,     // 1: Semitom menor (C#/Db)
  1.122462048309373,      // 2: Tom inteiro (D)
  1.189207115002721,      // 3: Terça menor (Eb)
  1.2599210498948732,     // 4: Terça maior (E)
  1.3348398541700344,     // 5: Quarta justa (F)
  1.4142135623730951,     // 6: Trítono (F#/Gb)
  1.4983070768766815,     // 7: Quinta justa (G)
  1.5874010519681994,     // 8: Sexta menor (Ab)
  1.681792830507429,      // 9: Sexta maior (A)
  1.7817974362806785,     // 10: Sétima menor (Bb)
  1.887748625363387,      // 11: Sétima maior (B)
];

/**
 * Lista de temperamentos disponíveis.
 * Para o MVP, apenas o temperamento igual está implementado.
 */
export const TUNING_LIST: TuningList = {
  equal: EQUAL_TEMPERAMENT,
};
