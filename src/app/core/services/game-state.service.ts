import { Injectable } from '@angular/core';
import { GraphEngineService } from './graph-engine.service';
import { HintService } from './hint.service';
import { ScoringService } from './scoring.service';
import { GameState, Level } from '../models/graph.model';

/** Resultado de uma tentativa de movimento */
export type MoveResult = 'moved' | 'won' | 'lost' | 'invalid';

/**
 * Máquina de estados do desafio em andamento (sessão em memória).
 *
 * Ciclo: startLevel → moveTo (repetido) → 'won' | 'lost' → reset/novo nível.
 *
 * Regras:
 *  - Só é possível mover para um vizinho local do nó atual (nada de saltos).
 *  - Alcançar o alvo dentro de maxMoves é vitória (vencer tem precedência).
 *  - Esgotar maxMoves sem alcançar o alvo é derrota.
 *  - Após concluído, nenhum movimento é aceito.
 */
@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  private state: GameState | null = null;

  constructor(
    private readonly graphEngine: GraphEngineService,
    private readonly hintService: HintService,
    private readonly scoringService: ScoringService
  ) {}

  startLevel(level: Level): void {
    this.state = {
      level,
      currentPath: [level.startNodeId],
      movesCount: 0,
      isComplete: false,
      outcome: null,
    };
  }

  getState(): GameState | null {
    return this.state;
  }

  /** Desafio ativo e ainda não concluído */
  isActive(): boolean {
    return !!this.state && !this.state.isComplete;
  }

  /** ID do nó em que o jogador está (último do trajeto) */
  currentNodeId(): string | null {
    if (!this.state) {
      return null;
    }
    const path = this.state.currentPath;
    return path.length > 0 ? path[path.length - 1] : null;
  }

  /**
   * Tenta mover para `nodeId`. Retorna o resultado da tentativa.
   */
  moveTo(nodeId: string): MoveResult {
    if (!this.state || this.state.isComplete) {
      return 'invalid';
    }

    const current = this.currentNodeId();
    if (current === null || nodeId === current) {
      return 'invalid';
    }

    // Apenas vizinho local é um movimento válido (nada de pular)
    if (!this.graphEngine.areNeighbors(current, nodeId)) {
      return 'invalid';
    }

    const nextPath = [...this.state.currentPath, nodeId];
    const movesCount = this.state.movesCount + 1;

    const targetReached = nodeId === this.state.level.goal.targetNodeId;
    const budgetExhausted = movesCount >= this.state.level.goal.maxMoves;

    this.state = {
      ...this.state,
      currentPath: nextPath,
      movesCount,
      isComplete: targetReached || budgetExhausted,
      outcome: targetReached ? 'win' : budgetExhausted ? 'lose' : null,
    };

    if (targetReached) {
      return 'won';
    }
    if (budgetExhausted) {
      return 'lost';
    }
    return 'moved';
  }

  /** Próximo passo sugerido rumo ao alvo, ou null quando não aplicável */
  requestHint(): string | null {
    if (!this.state || this.state.isComplete) {
      return null;
    }
    const current = this.currentNodeId();
    if (current === null) {
      return null;
    }
    return this.hintService.nextStep(current, this.state.level);
  }

  /** Estrelas (1–3) do desafio já concluído (usa ScoringService) */
  starsForResult(): 1 | 2 | 3 {
    if (!this.state) {
      return 1;
    }
    return this.scoringService.computeStars(this.state.level, this.state.movesCount);
  }

  reset(): void {
    this.state = null;
  }
}
