import { describe, it, expect } from 'vitest';
import {
  TonnetzIntervals,
  validateIntervals,
  TONNETZ_PRESETS,
} from './tonnetz-coordinate.model';

describe('TonnetzCoordinate Model', () => {
  describe('validateIntervals', () => {
    it('deve validar configuração clássica (3,4,5)', () => {
      const intervals: TonnetzIntervals = { interval1: 3, interval2: 4, interval3: 5 };
      expect(validateIntervals(intervals)).toBe(true);
    });

    it('deve validar configuração de tons inteiros (2,4,6)', () => {
      const intervals: TonnetzIntervals = { interval1: 2, interval2: 4, interval3: 6 };
      expect(validateIntervals(intervals)).toBe(true);
    });

    it('deve validar configuração cromática (1,4,7)', () => {
      const intervals: TonnetzIntervals = { interval1: 1, interval2: 4, interval3: 7 };
      expect(validateIntervals(intervals)).toBe(true);
    });

    it('deve validar configuração aumentada (4,4,4)', () => {
      const intervals: TonnetzIntervals = { interval1: 4, interval2: 4, interval3: 4 };
      expect(validateIntervals(intervals)).toBe(true);
    });

    it('deve rejeitar intervalos negativos', () => {
      const intervals: TonnetzIntervals = { interval1: -1, interval2: 4, interval3: 7 };
      expect(validateIntervals(intervals)).toBe(false);
    });

    it('deve rejeitar intervalos zero', () => {
      const intervals: TonnetzIntervals = { interval1: 0, interval2: 4, interval3: 7 };
      expect(validateIntervals(intervals)).toBe(false);
    });

    it('deve rejeitar intervalos maiores ou iguais a 12', () => {
      const intervals: TonnetzIntervals = { interval1: 12, interval2: 4, interval3: 7 };
      expect(validateIntervals(intervals)).toBe(false);
    });

    it('deve permitir configurações válidas mesmo com soma maior que 12', () => {
      // A validação permite somas até 36 para configurações não-oitava
      const intervals: TonnetzIntervals = { interval1: 11, interval2: 11, interval3: 11 };
      expect(validateIntervals(intervals)).toBe(true);
    });

    it('deve rejeitar soma de intervalos excessivamente grande', () => {
      const intervals: TonnetzIntervals = { interval1: 20, interval2: 20, interval3: 20 };
      expect(validateIntervals(intervals)).toBe(false);
    });
  });

  describe('TONNETZ_PRESETS', () => {
    it('deve ter preset clássico', () => {
      expect(TONNETZ_PRESETS['classic']).toEqual({ interval1: 3, interval2: 4, interval3: 5 });
    });

    it('deve ter preset de tons inteiros', () => {
      expect(TONNETZ_PRESETS['wholetone']).toEqual({ interval1: 2, interval2: 4, interval3: 6 });
    });

    it('deve ter preset cromático', () => {
      expect(TONNETZ_PRESETS['chromatic']).toEqual({ interval1: 1, interval2: 4, interval3: 7 });
    });

    it('deve ter preset diminuto', () => {
      expect(TONNETZ_PRESETS['diminished']).toEqual({ interval1: 1, interval2: 3, interval3: 8 });
    });

    it('deve ter preset aumentado', () => {
      expect(TONNETZ_PRESETS['augmented']).toEqual({ interval1: 4, interval2: 4, interval3: 4 });
    });

    it('todos os presets devem ser válidos', () => {
      Object.values(TONNETZ_PRESETS).forEach(preset => {
        expect(validateIntervals(preset)).toBe(true);
      });
    });
  });
});
