import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { AudioService } from './core/services/audio.service';

// Mock do AudioService para evitar problemas com Tone.js em testes
class MockAudioService {
  async initialize(): Promise<void> {}
  async playNote(noteWithOctave: string, duration?: string): Promise<void> {}
  async playChord(notes: string[], duration?: string): Promise<void> {}
  stopAll(): void {}
  dispose(): void {}
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: AudioService, useClass: MockAudioService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render game board component', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-game-board')).toBeTruthy();
  });
});
