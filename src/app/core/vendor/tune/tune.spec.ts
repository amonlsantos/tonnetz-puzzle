import { describe, it, expect } from 'vitest';
import { Tune, NOTE_NAMES_PT } from './tune';

describe('Tune', () => {
  let tuner: Tune;

  beforeEach(() => {
    tuner = new Tune('equal', 440);
  });

  describe('tune (cents calculation)', () => {
    it('should return 0 cents for 440Hz (A4 perfect)', () => {
      const cents = tuner.tune(440);
      expect(Math.abs(cents)).toBeLessThan(0.1); // Tolerância de 0.1 cent
    });

    it('should return ~19.6 cents for 445Hz (A4 sharp)', () => {
      const cents = tuner.tune(445);
      expect(cents).toBeGreaterThan(19);
      expect(cents).toBeLessThan(20);
    });

    it('should return ~-19.6 cents for 435Hz (A4 flat)', () => {
      const cents = tuner.tune(435);
      expect(cents).toBeLessThan(-19);
      expect(cents).toBeGreaterThan(-20);
    });

    it('should return ~-50 cents for A4 halfway to Bb4 (flattened toward A)', () => {
      // Meio semitom acima de 440 = 440 * 2^(0.5/12) ≈ 452.9 Hz.
      // MIDI = 69.5 → round = 70 (Bb) → cents = -50 (grave de Bb).
      const cents = tuner.tune(452.9);
      expect(Math.abs(cents + 50)).toBeLessThan(1);
    });

    it('should return 0 for frequency 0', () => {
      expect(tuner.tune(0)).toBe(0);
    });

    it('should return 0 for negative frequency', () => {
      expect(tuner.tune(-100)).toBe(0);
    });

    it('should handle octaves correctly (C4 and C5)', () => {
      const c4 = 261.63; // C4
      const c5 = 523.25; // C5 (dobro)

      const cents4 = tuner.tune(c4);
      const cents5 = tuner.tune(c5);

      // Ambos devem estar próximos de 0 (nota perfeita)
      expect(Math.abs(cents4)).toBeLessThan(1);
      expect(Math.abs(cents5)).toBeLessThan(1);
    });
  });

  describe('ftom (frequency to MIDI)', () => {
    it('should convert 440Hz to MIDI note 69 (A4)', () => {
      expect(tuner.ftom(440)).toBe(69);
    });

    it('should convert 261.63Hz to MIDI note 60 (C4)', () => {
      const midi = tuner.ftom(261.63);
      expect(Math.abs(midi - 60)).toBeLessThan(0.1);
    });

    it('should convert 880Hz to MIDI note 81 (A5)', () => {
      expect(tuner.ftom(880)).toBe(81);
    });

    it('should convert 220Hz to MIDI note 57 (A3)', () => {
      expect(tuner.ftom(220)).toBe(57);
    });

    it('should return 0 for frequency 0', () => {
      expect(tuner.ftom(0)).toBe(0);
    });
  });

  describe('getNoteName', () => {
    it('should return "A" for MIDI note 69 (A4)', () => {
      expect(tuner.getNoteName(69)).toBe('A');
    });

    it('should return "C" for MIDI note 60 (C4)', () => {
      expect(tuner.getNoteName(60)).toBe('C');
    });

    it('should return "Db" for MIDI note 61 (C#4)', () => {
      expect(tuner.getNoteName(61)).toBe('Db');
    });

    it('should return "D" for MIDI note 62 (D4)', () => {
      expect(tuner.getNoteName(62)).toBe('D');
    });

    it('should return "Eb" for MIDI note 63 (Eb4)', () => {
      expect(tuner.getNoteName(63)).toBe('Eb');
    });

    it('should return "E" for MIDI note 64 (E4)', () => {
      expect(tuner.getNoteName(64)).toBe('E');
    });

    it('should return "F" for MIDI note 65 (F4)', () => {
      expect(tuner.getNoteName(65)).toBe('F');
    });

    it('should return "Gb" for MIDI note 66 (F#4)', () => {
      expect(tuner.getNoteName(66)).toBe('Gb');
    });

    it('should return "G" for MIDI note 67 (G4)', () => {
      expect(tuner.getNoteName(67)).toBe('G');
    });

    it('should return "Ab" for MIDI note 68 (Ab4)', () => {
      expect(tuner.getNoteName(68)).toBe('Ab');
    });

    it('should return "Bb" for MIDI note 70 (Bb4)', () => {
      expect(tuner.getNoteName(70)).toBe('Bb');
    });

    it('should return "B" for MIDI note 71 (B4)', () => {
      expect(tuner.getNoteName(71)).toBe('B');
    });

    it('should handle octaves correctly (C4 and C5)', () => {
      expect(tuner.getNoteName(60)).toBe('C'); // C4
      expect(tuner.getNoteName(72)).toBe('C'); // C5
    });

    it('should handle negative MIDI notes', () => {
      // MIDI negativo wrap around (não comum mas deve funcionar)
      const name = tuner.getNoteName(-12);
      expect(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']).toContain(name);
    });
  });

  describe('NOTE_NAMES_PT mapping', () => {
    it('should have all 12 note names', () => {
      expect(Object.keys(NOTE_NAMES_PT)).toHaveLength(12);
    });

    it('should map C to Dó', () => {
      expect(NOTE_NAMES_PT['C']).toBe('Dó');
    });

    it('should map Db to Réb', () => {
      expect(NOTE_NAMES_PT['Db']).toBe('Réb');
    });

    it('should map D to Ré', () => {
      expect(NOTE_NAMES_PT['D']).toBe('Ré');
    });

    it('should map Eb to Mib', () => {
      expect(NOTE_NAMES_PT['Eb']).toBe('Mib');
    });

    it('should map E to Mi', () => {
      expect(NOTE_NAMES_PT['E']).toBe('Mi');
    });

    it('should map F to Fá', () => {
      expect(NOTE_NAMES_PT['F']).toBe('Fá');
    });

    it('should map G to Sol', () => {
      expect(NOTE_NAMES_PT['G']).toBe('Sol');
    });

    it('should map A to Lá', () => {
      expect(NOTE_NAMES_PT['A']).toBe('Lá');
    });

    it('should map B to Si', () => {
      expect(NOTE_NAMES_PT['B']).toBe('Si');
    });
  });

  describe('Integration: frequency → MIDI → note name', () => {
    it('should convert 440Hz → A', () => {
      const midi = tuner.ftom(440);
      const name = tuner.getNoteName(midi);
      expect(name).toBe('A');
    });

    it('should convert 261.63Hz → C', () => {
      const midi = tuner.ftom(261.63);
      const name = tuner.getNoteName(midi);
      expect(name).toBe('C');
    });

    it('should convert 293.66Hz → D', () => {
      const midi = tuner.ftom(293.66);
      const name = tuner.getNoteName(midi);
      expect(name).toBe('D');
    });

    it('should convert 329.63Hz → E', () => {
      const midi = tuner.ftom(329.63);
      const name = tuner.getNoteName(midi);
      expect(name).toBe('E');
    });
  });
});
