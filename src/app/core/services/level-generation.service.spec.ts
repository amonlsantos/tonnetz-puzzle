import { describe, it, expect } from 'vitest';
import { GraphEngineService } from '../services/graph-engine.service';
import { LevelGenerationService } from '../services/level-generation.service';
import { DIFFICULTY_BANDS, Difficulty } from '../models/graph.model';

function createService(): {
  graphEngine: GraphEngineService;
  service: LevelGenerationService;
} {
  const graphEngine = new GraphEngineService();
  const service = new LevelGenerationService(graphEngine);
  return { graphEngine, service };
}

/**
 * Constrói uma sequência de RNG determinística.
 * Cada chamada devolve o próximo valor da array (e encerra quando esgota).
 */
function seqRng(values: number[]): { rng: () => number; used: () => number[] } {
  const copy = [...values];
  const used: number[] = [];
  return {
    rng: () => {
      const v = copy.shift() ?? values[values.length - 1];
      used.push(v);
      return v;
    },
    used: () => used,
  };
}

/** Índice que produz o nó node_r{r}_c{c} no array row-major de getAllNodes da grade padrão 6×10 */
function nodeIndex(row: number, col: number): number {
  return row * 10 + col;
}

describe('LevelGenerationService', () => {
  describe('generateLevel', () => {
    it('gera um nível fácil válido para um par conhecido a distância 2', () => {
      const { service } = createService();
      // node_r0_c0 (idx 0) -> node_r0_c2 (idx 2): dois saltos na horizontal (d=2)
      const { rng } = seqRng([0, nodeIndex(0, 2) / 60]);

      const level = service.generateLevel('easy', rng);

      expect(level).not.toBeNull();
      expect(level!.difficulty).toBe('easy');
      expect(level!.startNodeId).toBe('node_r0_c0');
      expect(level!.goal.targetNodeId).toBe('node_r0_c2');
      expect(level!.goal.type).toBe('reachNode');
      expect(level!.shortestPathLength).toBe(2);
      expect(level!.goal.maxMoves).toBeGreaterThanOrEqual(level!.shortestPathLength);
    });

    it('respeita a faixa de dificuldade fácil [2,3]', () => {
      const { service } = createService();
      const { rng } = seqRng([0, nodeIndex(0, 2) / 60]); // d=2

      const level = service.generateLevel('easy', rng);
      const d = level!.shortestPathLength;
      expect(d).toBeGreaterThanOrEqual(DIFFICULTY_BANDS.easy.min);
      expect(d).toBeLessThanOrEqual(DIFFICULTY_BANDS.easy.max);
    });

    it('gera um nível médio válido para um par conhecido a distância 4', () => {
      const { service } = createService();
      // node_r0_c0 -> node_r0_c4: quatro saltos na horizontal (d=4)
      const { rng } = seqRng([0, nodeIndex(0, 4) / 60]);

      const level = service.generateLevel('medium', rng);
      expect(level).not.toBeNull();
      expect(level!.startNodeId).toBe('node_r0_c0');
      expect(level!.goal.targetNodeId).toBe('node_r0_c4');
      expect(level!.shortestPathLength).toBe(4);
    });

    it('gera um nível difícil válido para um par conhecido a distância 9', () => {
      const { service } = createService();
      // node_r0_c0 -> node_r0_c9: nove saltos na horizontal (d=9)
      const { rng } = seqRng([0, nodeIndex(0, 9) / 60]);

      const level = service.generateLevel('hard', rng);
      expect(level).not.toBeNull();
      expect(level!.startNodeId).toBe('node_r0_c0');
      expect(level!.goal.targetNodeId).toBe('node_r0_c9');
      expect(level!.shortestPathLength).toBe(9);
    });

    it('não escolhe start igual a target', () => {
      const { service } = createService();
      // Os três primeiros valores forçam start==target; o quarto resolve para r0_c3 (d=3, easy)
      const { rng } = seqRng([
        0,
        nodeIndex(0, 0) / 60, // target igual a start (rejeitado, reamostrado)
        nodeIndex(0, 0) / 60, // novamente igual (reamostrado)
        nodeIndex(0, 3) / 60, // target válido (d=3)
      ]);

      const level = service.generateLevel('easy', rng);
      expect(level).not.toBeNull();
      expect(level!.startNodeId).not.toBe(level!.goal.targetNodeId);
      expect(level!.goal.targetNodeId).toBe('node_r0_c3');
    });

    it('retorna null quando nenhum par na faixa é encontrado após as tentativas', () => {
      const { service } = createService();
      // Sempre o par r0_c0 -> r0_c1 (d=1), fora da faixa hard [7,14]
      const { rng } = seqRng(Array.from({ length: 100 }, (_, i) => (i % 2 === 0 ? 0 : nodeIndex(0, 1) / 60)));

      const level = service.generateLevel('hard', rng);
      expect(level).toBeNull();
    });

    it('cada dificuldade respeita sua própria faixa', () => {
      const { service } = createService();
      const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
      for (const difficulty of difficulties) {
        // Sonda aleatoriamente (RNG padrão) e valida a faixa sempre que gerar
        for (let i = 0; i < 20; i++) {
          const level = service.generateLevel(difficulty);
          if (!level) continue;
          const d = level.shortestPathLength;
          expect(d).toBeGreaterThanOrEqual(DIFFICULTY_BANDS[difficulty].min);
          expect(d).toBeLessThanOrEqual(DIFFICULTY_BANDS[difficulty].max);
        }
      }
    });
  });
});
