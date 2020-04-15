export type Color = 'blue' | 'white';

/**
 * Начало игры
 */
export type GameStartedMessage = {
	/** Тип сообщения */
	type: 'gameStarted';
	/** Мой ход? */
	gameState: GameState;
	field: Array<[number, ResourcesNames]>;
	color: Color;
};

/**
 * Игра прервана
 */
export type GameAbortedMessage = {
	/** Тип сообщения */
	type: 'gameAborted';
};

export type ResourcesNames = 'wood' | 'fur' |'clay' | 'mountain' | 'field' | 'none';

export type Resources = {
	wood: number;
	fur: number;
	clay: number;
	mountain: number;
	field: number;
};

export type PlayerState = {
	points: number;
	resources: Resources;
	color: Color;
};

export type Building = 'road' | 'village' | 'city';

export type Hex = {
	id: number;
	token: number;
	resource: ResourcesNames | '';
	paths: [number, number, number, number, number, number];
	nodes: [number, number, number, number, number, number]
};

export type Path = {
	id: number;
	nodes: [number, number];
};

export type NodeSpecific = 'special'| ResourcesNames;

export type Node = {
	id: number;
	paths: [number, number, number];
	specific: NodeSpecific;
};

export type Build = {
	name: 'build';
	place: number;
	type: Building;
};

export type GameValues = {
	is_rolled: boolean;
	is_built_road: boolean;
	is_built_village: boolean;
	is_start: boolean;
};

export type EndTurn = {
	name: 'endTurn';
};

export type DiceRoll = {
	name: 'diceRoll';
};

export type Trade = {
	name: 'trade';
	coefficient: number;
	from: ResourcesNames;
	to: ResourcesNames;
};

export type BuildState = {
	id: number;
	color: Color;
};

export type GiveUp = {
	name: 'giveUp';
	color: Color;
};

export type GameState = {
	players: [PlayerState, PlayerState];
	dice: number;
	roads: Array<BuildState>;
	villages: Array<BuildState>;
	cities: Array<BuildState>;
	color: String;
};

export type PlayerAction = Trade | Build | DiceRoll | EndTurn | GiveUp;

/**
 * Ход игрока
 */
export type PlayerMoveMessage = {
	/** Тип сообщения */
	type: 'playerMove';
	/** Число, названное игроком */
	action: PlayerAction;
};

/**
 * Результат хода игроков
 */
export type GameResultMessage = {
	/** Тип сообщения */
	type: 'gameResult';
	/** Победа? */
	win: boolean;
};

/**
 * Смена игрока
 */
export type ChangePlayerMessage = {
	/** Тип сообщения */
	type: 'changePlayer';
	/** Мой ход? */
	gameState: GameState;
	color: Color;
};

/**
 * Повтор игры
 */
export type RepeatGame = {
	/** Тип сообщения */
	type: 'repeatGame';
};

/**
 * Некорректный запрос клиента
 */
export type IncorrectRequestMessage = {
	/** Тип сообщения */
	type: 'incorrectRequest';
	/** Сообщение об ошибке */
	message: string;
};

/**
 * Некорректный ответ сервера
 */
export type IncorrectResponseMessage = {
	/** Тип сообщения */
	type: 'incorrectResponse';
	/** Сообщение об ошибке */
	message: string;
};

/**
 * Сообщения от сервера к клиенту
 */
export type AnyServerMessage =
	| GameStartedMessage
	| GameAbortedMessage
	| GameResultMessage
	| ChangePlayerMessage
	| IncorrectRequestMessage
	| IncorrectResponseMessage;

/** 
 * Сообщения от клиента к серверу
 */
export type AnyClientMessage =
	| PlayerMoveMessage
	| RepeatGame
	| IncorrectRequestMessage
	| IncorrectResponseMessage;
