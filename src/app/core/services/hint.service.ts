import { Injectable } from '@angular/core';
import { GraphEngineService } from './graph-engine.service';
import { Level } from '../models/graph.model';

/**
 * Calcula dicas de navegação: o próximo nó a clicar para seguir o caminho
 * mais curto do ponto atual até o alvo do nível. Não altera o estado do jogo;
 * apenas consulta o grafo.
 */
@Injectable({
  providedIn: 'root',
})
export class HintService {
  constructor(private readonly graphEngine: GraphEngineService) {}

  /**
   * Retorna o próximo nó no caminho mais curto de `currentNodeId` até o alvo
   * do nível, ou null se já estiver no alvo / não houver caminho.
   */
  nextStep(currentNodeId: string, level: Level): string | null {
    const path = this.graphEngine.getShortestPath(currentNodeId, level.goal.targetNodeId);
    if (path.length < 2) {
      return null;
    }
    return path[1];
  }
}
