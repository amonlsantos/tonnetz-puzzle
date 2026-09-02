import { Injectable } from '@angular/core';
import { GraphEngineService } from './graph-engine.service';
import {
  Difficulty,
  Level,
  DIFFICULTY_BANDS,
  maxMovesForDifficulty,
} from '../models/graph.model';

/** Número máximo de tentativas de amostragem antes de desistir de um nível */
export const MAX_GENERATION_ATTEMPTS = 25;

/** Gerador de números pseudo-aleatórios: retorna um valor em [0, 1) */
export type Rng = () => number;

/**
 * Gera níveis "alcance o alvo" aleatoriamente a partir da malha atual.
 *
 * A estratégia é rejeição-simples: sorteia um par (start, target), mede a
 * distância do caminho mínimo via GraphEngineService e rejeita pares fora da
 * faixa de dificuldade. Como o grafo é conexo, o caminho sempre existe; o
 * guarda de solvabilidade é apenas uma rede de segurança para configurações
 * futuras que possam desconectar a malha.
 */
@Injectable({
  providedIn: 'root',
})
export class LevelGenerationService {
  constructor(private readonly graphEngine: GraphEngineService) {}

  /**
   * Gera um nível para a dificuldade informada, ou null se nenhum par
   * satisfazer a faixa após as tentativas.
   */
  generateLevel(difficulty: Difficulty, rng: Rng = Math.random): Level | null {
    const nodeIds = this.graphEngine.getAllNodes().map(node => node.id);
    if (nodeIds.length < 2) {
      return null;
    }

    const band = DIFFICULTY_BANDS[difficulty];

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const startNodeId = this.pickIndex(nodeIds, rng);
      const targetNodeId = this.pickDistinctIndex(nodeIds, startNodeId, rng);
      if (!targetNodeId) {
        continue;
      }

      const path = this.graphEngine.getShortestPath(startNodeId, targetNodeId);
      if (path.length === 0) {
        continue;
      }

      const distance = path.length - 1;
      if (distance < band.min || distance > band.max) {
        continue;
      }

      return {
        id: `${difficulty}-${Date.now()}-${attempt}`,
        difficulty,
        startNodeId,
        goal: {
          type: 'reachNode',
          targetNodeId,
          maxMoves: maxMovesForDifficulty(difficulty, distance),
        },
        shortestPathLength: distance,
      };
    }

    return null;
  }

  /** Sorteia um índice de nó em [0, 1) uniforme */
  private pickIndex(nodeIds: string[], rng: Rng): string {
    return nodeIds[Math.floor(rng() * nodeIds.length)];
  }

  /** Sorteia um nó diferente de `exclude`, com reamostragem limitada */
  private pickDistinctIndex(
    nodeIds: string[],
    exclude: string,
    rng: Rng
  ): string | null {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const candidate = this.pickIndex(nodeIds, rng);
      if (candidate !== exclude) {
        return candidate;
      }
    }
    return null;
  }
}
