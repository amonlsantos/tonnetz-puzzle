import { Component } from '@angular/core';
import { GameBoardComponent } from './features/game-board/game-board.component';

@Component({
  selector: 'app-root',
  imports: [GameBoardComponent],
  template: '<app-game-board></app-game-board>',
  styleUrl: './app.scss'
})
export class App {}
