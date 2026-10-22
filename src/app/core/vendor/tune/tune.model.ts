/**
 * Tipos TypeScript para o módulo Tune (vendor).
 */

/**
 * Tabela de temperamento: razões de frequência para cada grau da escala.
 */
export type TuningTable = number[];

/**
 * Dicionário de temperamentos disponíveis.
 */
export interface TuningList {
  equal: TuningTable;
}
