/**
 * S4WN Babylon.js/TypeScript - Main Entry Point (DEBUG)
 *
 * Stripped to match stripped GameApp for terrain rendering isolation test.
 */
import { GameApp } from './GameApp';
import { errorHandler } from './core/ErrorHandler';
import './ui/styles.css';

errorHandler.init();
const app = new GameApp('renderCanvas');
(window as any).gameApp = app;
