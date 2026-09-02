import { describe, it, expect } from 'vitest';
import { Level } from '../models/graph.model';
import { createScoringService } from './services.spec-helper';

function makeLevel(shortestPathLength: number, maxMoves: number): Level {
  return {
    id: 'lvl-1',
    difficulty: 'medium',
    startNodeId: 'node_r0_c0',
    goal: { type: 'reachNode', targetNodeId: 'node_r4_c6', maxMoves },
    shortestPathLength,
  };
}

describe('ScoringService', () => {
  describe('computeStars', () => {
    it('dá 3 estrelas quando joga de forma ótima (movimentos == caminho mínimo)', () => {
      const { service } = createScoringService();
      const level = makeLevel(5, 8);
      expect(service.computeStars(level, 5)).toBe(3);
    });

    it('dá 2 estrelas dentro de uma folga pequena', () => {
      const { service } = createScoringService();
      const level = makeLevel(5, 8);
      expect(service.computeStars(level, 6)).toBe(2);
      expect(service.computeStars(level, 7)).toBe(2);
    });

    it('dá 1 estrela quando está bem acima do caminho mínimo', () => {
      const { service } = createScoringService();
      const level = makeLevel(5, 8);
      expect(service.computeStars(level, 8)).toBe(1);
    });

    it('sempre retorna ao menos 1 estrela para um nível vencido', () => {
      const { service } = createScoringService();
      const level = makeLevel(2, 6);
      for (let m = 2; m <= 6; m++) {
        const stars = service.computeStars(level, m);
        expect(stars).toBeGreaterThanOrEqual(1);
        expect(stars).toBeLessThanOrEqual(3);
      }
    });

    it('diferença de dificuldade não altera a contagem de estrelas (apenas o maxMoves)', () => {
      const { service } = createScoringService();
      const easy = makeLevel(3, 8);
      const hard = makeLevel(3, 5);
      // A mesma folga relativa de movimentos gera as mesmas estrelas
      expect(service.computeStars(easy, 3)).toBe(service.computeStars(hard, 3));
    });
  });
});
