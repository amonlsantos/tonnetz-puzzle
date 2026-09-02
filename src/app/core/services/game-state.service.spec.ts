import { describe, it, expect } from 'vitest';
import { createGameServices, makeLevel } from './services.spec-helper';

describe('GameStateService', () => {
  describe('startLevel', () => {
    it('inicia um desafio a partir do nó inicial com zero movimentos', () => {
      const { game } = createGameServices();
      const level = makeLevel('node_r0_c2', 5);
      game.startLevel(level);

      const state = game.getState();
      expect(state).not.toBeNull();
      expect(state!.level).toBe(level);
      expect(state!.currentPath).toEqual(['node_r0_c0']);
      expect(state!.movesCount).toBe(0);
      expect(state!.isComplete).toBe(false);
      expect(state!.outcome).toBeNull();
    });
  });

  describe('moveTo', () => {
    it('permite mover para um vizinho e conta o movimento', () => {
      const { game } = createGameServices();
      const level = makeLevel('node_r0_c2', 5);
      game.startLevel(level);

      const result = game.moveTo('node_r0_c1');
      expect(result).toBe('moved');
      expect(game.getState()!.currentPath).toEqual(['node_r0_c0', 'node_r0_c1']);
      expect(game.getState()!.movesCount).toBe(1);
    });

    it('recusa movimento não adjacente (proibido pular)', () => {
      const { game } = createGameServices();
      const level = makeLevel('node_r0_c2', 5);
      game.startLevel(level);

      const result = game.moveTo('node_r0_c2'); // salto direto, não adjacente
      expect(result).toBe('invalid');
      expect(game.getState()!.currentPath).toEqual(['node_r0_c0']);
      expect(game.getState()!.movesCount).toBe(0);
    });

    it('declara vitória ao alcançar o alvo', () => {
      const { game } = createGameServices();
      const level = makeLevel('node_r0_c2', 5);
      game.startLevel(level);

      game.moveTo('node_r0_c1');
      const result = game.moveTo('node_r0_c2');
      expect(result).toBe('won');
      const state = game.getState()!;
      expect(state.isComplete).toBe(true);
      expect(state.outcome).toBe('win');
      expect(state.movesCount).toBe(2);
    });

    it('declara derrota ao esgotar o limite de movimentos sem alcançar o alvo', () => {
      const { game } = createGameServices();
      const level = makeLevel('node_r0_c4', 3); // precisa de 4 passos, mas só tem 3
      game.startLevel(level);

      game.moveTo('node_r0_c1');
      game.moveTo('node_r0_c2');
      const result = game.moveTo('node_r0_c3'); // 3º movimento, não é o alvo → perdido
      expect(result).toBe('lost');
      const state = game.getState()!;
      expect(state.isComplete).toBe(true);
      expect(state.outcome).toBe('lose');
    });

    it('não permite mover após o desafio estar completo', () => {
      const { game } = createGameServices();
      const level = makeLevel('node_r0_c2', 5);
      game.startLevel(level);
      game.moveTo('node_r0_c1');
      game.moveTo('node_r0_c2'); // won

      const result = game.moveTo('node_r0_c3');
      expect(result).toBe('invalid');
    });

    it('não permite mover sem desafio ativo', () => {
      const { game } = createGameServices();
      expect(game.moveTo('node_r0_c1')).toBe('invalid');
    });
  });

  describe('requestHint', () => {
    it('retorna o próximo passo rumo ao alvo a partir da posição atual', () => {
      const { game } = createGameServices();
      const level = makeLevel('node_r0_c2', 5);
      game.startLevel(level);
      game.moveTo('node_r0_c1');

      expect(game.requestHint()).toBe('node_r0_c2');
    });

    it('retorna null quando o desafio está completo', () => {
      const { game } = createGameServices();
      const level = makeLevel('node_r0_c2', 5);
      game.startLevel(level);
      game.moveTo('node_r0_c1');
      game.moveTo('node_r0_c2');

      expect(game.requestHint()).toBeNull();
    });

    it('retorna null sem desafio ativo', () => {
      const { game } = createGameServices();
      expect(game.requestHint()).toBeNull();
    });
  });

  describe('reset', () => {
    it('limpa o estado do desafio atual', () => {
      const { game } = createGameServices();
      game.startLevel(makeLevel('node_r0_c2', 5));
      game.moveTo('node_r0_c1');
      game.reset();

      expect(game.getState()).toBeNull();
    });
  });

  describe('starsForResult', () => {
    it('calcula as estrelas do desafio concluído via ScoringService', () => {
      const { game } = createGameServices();
      const level = makeLevel('node_r0_c2', 5); // shortest 2
      game.startLevel(level);
      game.moveTo('node_r0_c1');
      game.moveTo('node_r0_c2'); // 2 movimentos == shortest → 3 estrelas

      expect(game.starsForResult()).toBe(3);
    });
  });
});
