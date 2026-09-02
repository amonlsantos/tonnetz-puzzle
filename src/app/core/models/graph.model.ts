/**
 * Modelos de domínio do jogo Tonnetz Puzzle.
 *
 * O jogo propõe desafios "alcance o alvo": o jogador navega pela malha de
 * nó em nó (apenas vizinhos locais são clicáveis) até alcançar o nó de
 * destino dentro de um limite de movimentos.
 */

/** Níveis de dificuldade dos desafios */
export type Difficulty = 'easy' | 'medium' | 'hard';

/** Tipos de objetivo de um nível */
export type LevelGoalType = 'reachNode';

/**
 * Objetivo de um nível.
 *
 * Para o MVP, apenas 'reachNode' (alcançar um nó-alvo em até maxMoves
 * movimentos). Os tipos 'collectNodes' e 'playChord' ficam fora de escopo
 * e podem ser adicionados futuramente sem quebrar este modelo.
 */
export interface LevelGoal {
  type: LevelGoalType;
  targetNodeId: string;
  maxMoves: number;
}

/**
 * Um nível (desafio) gerado: navegue do nó inicial até o nó-alvo.
 *
 * `shortestPathLength` é pré-computado na geração para que a pontuação e as
 * dicas não precisem recalcular o caminho a cada consulta.
 */
export interface Level {
  id: string;
  difficulty: Difficulty;
  startNodeId: string;
  goal: LevelGoal;
  shortestPathLength: number;
}

/** Resultado de um desafio concluído */
export type ChallengeOutcome = 'win' | 'lose';

/**
 * Estado em memória de um desafio em andamento (sessões frescas, sem
 * persistência). Não é armazenado no disco — recomeça a cada sessão.
 */
export interface GameState {
  level: Level;
  currentPath: string[];
  movesCount: number;
  isComplete: boolean;
  outcome: ChallengeOutcome | null;
}

/** Faixa de comprimento de caminho mínimo por dificuldade */
export interface DifficultyBand {
  min: number;
  max: number;
}

/**
 * Faixas de dificuldade baseadas na medição empírica do grafo 6×10
 * (diâmetro 14; ~54% dos pares a 3-4 passos):
 *   easy:   [2, 3]
 *   medium: [4, 6]
 *   hard:   [7, 14]
 */
export const DIFFICULTY_BANDS: Record<Difficulty, DifficultyBand> = {
  easy: { min: 2, max: 3 },
  medium: { min: 4, max: 6 },
  hard: { min: 7, max: 14 },
};

/**
 * Folga (em movimentos) acima do caminho mínimo por dificuldade.
 *
 * É a única fonte de verdade para o ajuste de dificuldade: quanto mais fácil,
 * mais folga. Usada tanto para o limite de movimentos (maxMoves) quanto para a
 * pontuação em estrelas, evitando que os dois valores divergam.
 */
export const DIFFICULTY_SLACK: Record<Difficulty, number> = {
  easy: 3,
  medium: 2,
  hard: 1,
};

/**
 * Margem de movimentos acima do caminho mínimo (par) permitida por
 * dificuldade. Quanto mais fácil, mais folga por movimento útil.
 */
export function maxMovesForDifficulty(difficulty: Difficulty, shortestPathLength: number): number {
  return shortestPathLength + DIFFICULTY_SLACK[difficulty];
}
