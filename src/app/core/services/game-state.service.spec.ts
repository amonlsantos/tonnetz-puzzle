import { describe, it, expect } from 'vitest';
import { createGameServices, makeLevel } from './services.spec-helper';
import { Level } from '../models/graph.model';
import { TONNETZ_PRESETS } from '../models/tonnetz-coordinate.model';

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

  describe('moveToPitchClass', () => {
    it('avança para um vizinho local cuja classe de altura corresponde à nota', () => {
      const { game } = createGameServices();
      game.startLevel(makeLevel('node_r0_c2', 5));

      // r0_c0 (C) tem como vizinho r0_c1 (G, pitchClass 7)
      const result = game.moveToPitchClass(7);

      expect(result).toBe('moved');
      expect(game.getState()!.currentPath).toEqual(['node_r0_c0', 'node_r0_c1']);
      expect(game.getState()!.movesCount).toBe(1);
      expect(game.getState()!.errorsCount).toBe(0);
    });

    it('vence ao tocar a nota de um vizinho que é o alvo', () => {
      const { game } = createGameServices();
      game.startLevel(makeLevel('node_r0_c1', 5, 'easy', 1));

      const result = game.moveToPitchClass(7);

      expect(result).toBe('won');
      const state = game.getState()!;
      expect(state.currentPath).toEqual(['node_r0_c0', 'node_r0_c1']);
      expect(state.outcome).toBe('win');
      expect(state.errorsCount).toBe(0);
    });

    it('conta erro e não move quando a nota não é vizinha local', () => {
      const { game } = createGameServices();
      game.startLevel(makeLevel('node_r0_c2', 5));

      // E (pitchClass 4) existe na malha, mas não é vizinho de r0_c0
      const result = game.moveToPitchClass(4);

      expect(result).toBe('invalid');
      expect(game.getState()!.currentPath).toEqual(['node_r0_c0']);
      expect(game.getState()!.movesCount).toBe(0);
      expect(game.getState()!.errorsCount).toBe(1);
    });

    it('não conta erro sem desafio ativo', () => {
      const { game } = createGameServices();

      expect(game.moveToPitchClass(4)).toBe('invalid');
      expect(game.getState()).toBeNull();
    });

    it('não conta erro depois que o desafio foi concluído', () => {
      const { game } = createGameServices();
      game.startLevel(makeLevel('node_r0_c1', 5, 'easy', 1));
      game.moveToPitchClass(7); // won

      expect(game.moveToPitchClass(4)).toBe('invalid');
      expect(game.getState()!.errorsCount).toBe(0);
    });

    it('desempata por menor distância ao alvo quando há vários vizinhos com a mesma nota', () => {
      const { graphEngine, game } = createGameServices();
      graphEngine.setIntervals(TONNETZ_PRESETS['augmented']);

      // No preset aumentado, r2_c2 tem três vizinhos com pitchClass 4.
      const level: Level = {
        id: 'augmented-1',
        difficulty: 'easy',
        startNodeId: 'node_r2_c2',
        goal: { type: 'reachNode', targetNodeId: 'node_r1_c3', maxMoves: 5 },
        shortestPathLength: 1,
      };
      game.startLevel(level);

      const result = game.moveToPitchClass(4);

      expect(result).toBe('won');
      expect(game.getState()!.currentPath).toEqual(['node_r2_c2', 'node_r1_c3']);
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

    it('considera os erros do modo instrumento na pontuação', () => {
      const { game } = createGameServices();
      const level = makeLevel('node_r0_c2', 5); // shortest 2
      game.startLevel(level);

      game.moveToPitchClass(4); // erro
      game.moveToPitchClass(0); // nota atual, também erro
      game.moveToPitchClass(7); // r0_c1
      game.moveToPitchClass(2); // alvo r0_c2

      expect(game.getState()!.errorsCount).toBe(2);
      expect(game.starsForResult()).toBe(2);
    });
  });
});
