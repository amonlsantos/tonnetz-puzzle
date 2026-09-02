import { GraphEngineService } from './graph-engine.service';
import { HintService } from './hint.service';
import { ScoringService } from './scoring.service';
import { GameStateService } from './game-state.service';
import { Level, LevelGoal } from '../models/graph.model';

/**
 * Helpers compartilhados entre os testes dos serviços do jogo.
 *
 * Serviços são criados diretamente (sem TestBed) por serem puros e
 * determinísticos frente ao GraphEngineService real da malha padrão 6×10.
 */

export function makeLevel(
  targetNodeId: string,
  maxMoves = 5,
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  shortestPathLength = 2
): Level {
  const goal: LevelGoal = { type: 'reachNode', targetNodeId, maxMoves };
  return {
    id: 'lvl-1',
    difficulty,
    startNodeId: 'node_r0_c0',
    goal,
    shortestPathLength,
  };
}

export function createGameServices(): {
  graphEngine: GraphEngineService;
  game: GameStateService;
} {
  const graphEngine = new GraphEngineService();
  const hint = new HintService(graphEngine);
  const scoring = new ScoringService();
  const game = new GameStateService(graphEngine, hint, scoring);
  return { graphEngine, game };
}

export function createHintServices(): {
  graphEngine: GraphEngineService;
  hint: HintService;
} {
  const graphEngine = new GraphEngineService();
  const hint = new HintService(graphEngine);
  return { graphEngine, hint };
}

export function createScoringService(): {
  service: ScoringService;
} {
  return { service: new ScoringService() };
}
