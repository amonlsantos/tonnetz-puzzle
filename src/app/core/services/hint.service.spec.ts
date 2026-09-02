import { describe, it, expect } from 'vitest';
import { createHintServices, makeLevel } from './services.spec-helper';

describe('HintService', () => {
  describe('nextStep', () => {
    it('retorna o próximo nó no caminho mais curto rumo ao alvo', () => {
      const { hint } = createHintServices();
      // alvo node_r0_c2; de node_r0_c0 o próximo passo é node_r0_c1 (vizinho)
      const level = makeLevel('node_r0_c2');
      const step = hint.nextStep('node_r0_c0', level);
      expect(step).toBe('node_r0_c1');
    });

    it('retorna null quando já está no alvo', () => {
      const { hint } = createHintServices();
      const level = makeLevel('node_r0_c2');
      expect(hint.nextStep('node_r0_c2', level)).toBeNull();
    });

    it('retorna null quando não há caminho (nó inexistente)', () => {
      const { hint } = createHintServices();
      const level = makeLevel('node_r0_c2');
      expect(hint.nextStep('node_invalido', level)).toBeNull();
    });

    it('o passo retornado é sempre um vizinho do nó atual', () => {
      const { graphEngine, hint } = createHintServices();
      const level = makeLevel('node_r3_c5');
      const step = hint.nextStep('node_r0_c0', level);
      expect(step).not.toBeNull();
      expect(graphEngine.areNeighbors('node_r0_c0', step!)).toBe(true);
    });
  });
});
