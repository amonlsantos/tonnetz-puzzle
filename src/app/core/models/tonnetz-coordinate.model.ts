/**
 * Coordenadas axiais do Tonnetz
 * q e r representam deslocamentos nos eixos de dois intervalos
 */
export interface TonnetzCoordinate {
  q: number; // Eixo do primeiro intervalo
  r: number; // Eixo do segundo intervalo
}

/**
 * Configuração de intervalos do Tonnetz
 * Representa os três intervalos que formam a estrutura
 */
export interface TonnetzIntervals {
  interval1: number; // Primeiro intervalo (ex: 3 semitons - terça menor)
  interval2: number; // Segundo intervalo (ex: 4 semitons - terça maior)
  interval3: number; // Terceiro intervalo (ex: 5 semitons - quarta justa)
}

/**
 * Valida se a configuração de intervalos é válida
 */
export function validateIntervals(intervals: TonnetzIntervals): boolean {
  const { interval1, interval2, interval3 } = intervals;
  
  // Intervalos devem ser positivos
  if (interval1 <= 0 || interval2 <= 0 || interval3 <= 0) {
    return false;
  }
  
  // Intervalos devem ser menores que 12
  if (interval1 >= 12 || interval2 >= 12 || interval3 >= 12) {
    return false;
  }
  
  // Para divisões da oitava, a soma deve ser 12
  const sum = interval1 + interval2 + interval3;
  if (sum === 12) {
    return true;
  }
  
  // Permitir outras configurações válidas
  // mas evitar combinações que não fazem sentido musical
  return sum > 0 && sum <= 36;
}

/**
 * Configurações pré-definidas de Tonnetz
 */
export const TONNETZ_PRESETS: Record<string, TonnetzIntervals> = {
  classic: { interval1: 3, interval2: 4, interval3: 5 }, // Tonnetz clássico
  wholetone: { interval1: 2, interval2: 4, interval3: 6 }, // Escala de tons inteiros
  chromatic: { interval1: 1, interval2: 4, interval3: 7 }, // Cromático com quinta
  diminished: { interval1: 1, interval2: 3, interval3: 8 }, // Acordes diminutos
  augmented: { interval1: 4, interval2: 4, interval3: 4 }, // Acordes aumentados
};
