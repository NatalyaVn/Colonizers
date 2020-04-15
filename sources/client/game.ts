import {openScreen} from './screens.js';
import * as GameScreen from './screens/game.js';
import * as ResultScreen from './screens/result.js';
import {Color, GameState, PlayerAction, ResourcesNames} from "../common/messages";

GameScreen.setTurnHandler( turnHandler );
ResultScreen.setRestartHandler( restartHandler );

/**
 * Отправляет сообщение на сервер
 */
let sendMessage: typeof import( './connection.js' ).sendMessage;

/**
 * Устанавливает функцию отправки сообщений на сервер
 * 
 * @param sendMessageFunction Функция отправки сообщений
 */
function setSendMessage( sendMessageFunction: typeof sendMessage ): void
{
	sendMessage = sendMessageFunction;
}

/**
 * Обрабатывает ход игрока
 *
 * @param action
 */
function turnHandler( action: PlayerAction ): void
{
	sendMessage( {
		type: 'playerMove',
		action: action
	} );
}

/**
 * Обрабатывает перезапуск игры
 */
function restartHandler(): void
{
	sendMessage( {
		type: 'repeatGame',
	} );
}

/**
 * Начинает игру
 */
function startGame(): void
{
	openScreen( 'game' );
}

function initGame(gameState: GameState, field: Array<[number, ResourcesNames]>, color : Color) : void
{
	GameScreen.update( gameState, color );
	GameScreen.setField(field, color);
}

/**
 * Меняет активного игрока
 */
function changePlayer( gameState : GameState, color : Color ): void
{
	GameScreen.update( gameState, color );
}


/**
 * Завершает игру
 * 
 * @param result Результат игры
 */
function endGame( result: 'win' | 'loose' | 'abort' ): void
{
	GameScreen.remove();
	ResultScreen.update( result );
	openScreen( 'result' );
}

export {
	startGame,
	initGame,
	changePlayer,
	endGame,
	setSendMessage,
};
