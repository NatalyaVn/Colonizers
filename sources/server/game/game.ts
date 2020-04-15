import WebSocket from 'ws';
import {onError} from './on-error.js';
import buildCost from './resources/buildings-cost.json'
import field from './resources/field.json'

import {
	AnyClientMessage,
	AnyServerMessage,
	Build,
	Building,
	BuildState,
	Color,
	GameAbortedMessage,
	GameStartedMessage,
	GameState,
	GameValues,
	Hex,
	Node,
	Path,
	PlayerMoveMessage,
	Resources,
	ResourcesNames,
	Trade
} from '../../common/messages.js';

/**
 * Класс игры
 * 
 * Запускает игровую сессию.
 */
class Game
{
	/**
	 * Количество игроков в сессии
	 */
	static readonly PLAYERS_IN_SESSION = 2;

	/**
	 * Игровая сессия
	 */
	private _session: WebSocket[];
	/**
	 * Информация о ходах игроков
	 */
	private _playersState!: WeakMap<WebSocket, Color>;

	private _currentMove!: WebSocket;

	private _gameState!: GameState;

	private _specialNodes = [1, 4, 27, 33, 48, 50, 52, 53];
	private _furNodes = [43, 47];
	private _clayNodes = [34, 39];
	private _woodNodes = [11, 16];
	private _fieldNodes = [2, 6];
	private _mountainNodes = [12, 17];


	private _gameValues : GameValues = {
		is_built_road: false,
		is_built_village: false,
		is_rolled: false,
		is_start: true
	};

	private _hexes = field.hexes as Array<Hex>;
	private _field : Array<[number, ResourcesNames]>;
	private readonly _paths = field.paths as Array<Path>;
	private readonly _nodes = field.nodes as Array<Node>;

	/**
	 * @param session Сессия игры, содержащая перечень соединений с игроками
	 */
	constructor( session: WebSocket[] )
	{
		this._session = session;
		this._field = this._generateField();
		this._gameState = {
			players: [
				{
					points: 0,
					resources:{
						wood: 0,
						fur: 0,
						clay: 0,
						mountain: 0,
						field: 0,
					},
					color: 'white'
				},
				{
					points: 0,
					resources:{
						wood: 0,
						fur: 0,
						clay: 0,
						mountain: 0,
						field: 0,
					},
					color: 'blue'
				}
			],
			dice: 0,
			roads: [],
			villages: [],
			cities: [],
			color: 'white'
		};
		this._gameValues = {
			is_built_road: false,
			is_built_village: false,
			is_rolled: false,
			is_start: true
		};
		this._sendStartMessage()
			.then(
				() =>
				{
					this._listenMessages();
				}
			)
			.catch( onError );
	}

	/**
	 * Уничтожает данные игровой сессии
	 */
	destroy(): void
	{
		// Можно вызвать только один раз
		this.destroy = () => {};

		for ( const player of this._session )
		{
			if (
				( player.readyState !== WebSocket.CLOSED )
				&& ( player.readyState !== WebSocket.CLOSING )
			)
			{
				const message: GameAbortedMessage = {
					type: 'gameAborted',
				};

				this._sendMessage( player, message )
					.catch( onError );
				player.close();
			}
		}

		// Обнуляем ссылки
		this._session = null as unknown as Game['_session'];
		this._playersState = null as unknown as Game['_playersState'];
	}

	private _generateField() : Array<[number, ResourcesNames]>
	{
		let arrayNums : Array<number> = new Array<number>();
		for (let i = 1; i <= 18; i++)
			arrayNums.push(i);
		arrayNums.sort(function() {
			return .5 - Math.random();
		});

		let arrayRes: Array<ResourcesNames> = new Array<ResourcesNames>();
		for (let i = 0; i < field.mountain; i++) arrayRes.push('mountain');
		for (let i = 0; i < field.fur; i++) arrayRes.push('fur');
		for (let i = 0; i < field.field; i++) arrayRes.push('field');
		for (let i = 0; i < field.clay; i++) arrayRes.push('clay');
		for (let i = 0; i < field.wood; i++) arrayRes.push('wood');
		arrayRes.sort(function() {
			return .5 - Math.random();
		});
		let array : Array<[number, ResourcesNames]> = new Array<[number, ResourcesNames]>();
		arrayNums.forEach((item, index) => array.push([item, arrayRes[index]]));
		for (let [id, resource] of array) {
			this._hexes.forEach(hex => {
				if (hex.id === id) hex.resource = resource;
			});
		}
		return array;
	}

	/**
	 * Отправляет сообщение о начале игры
	 */
	private _sendStartMessage(): Promise<void[]>
	{
		this._playersState = new WeakMap<WebSocket, Color>();
		this._currentMove = this._session[0];

		const data: GameStartedMessage = {
			gameState: this._gameState,
			type: 'gameStarted',
			field: this._field,
			color: 'white'
		};
		const promises: Promise<void>[] = [];

		for ( const player of this._session )
		{
			promises.push( this._sendMessage( player, data ) );
			this._playersState.set(player, data.color);
			data.color = 'blue';
		}

		return Promise.all( promises );
	}

	/**
	 * Отправляет сообщение игроку
	 *
	 * @param player Игрок
	 * @param message Сообщение
	 */
	private _sendMessage( player: WebSocket, message: AnyServerMessage ): Promise<void>
	{
		return new Promise(
			( resolve, reject ) =>
			{
				player.send(
					JSON.stringify( message ),
					( error ) =>
					{
						if ( error )
						{
							reject();

							return;
						}

						resolve();
					}
				)
			},
		);
	}

	/**
	 * Добавляет слушателя сообщений от игроков
	 */
	private _listenMessages(): void
	{
		for ( const player of this._session )
		{
			player.on(
				'message',
				( data ) =>
				{
					const message = this._parseMessage( data );

					this._processMessage( player, message );
				},
			);

			player.on( 'close', () => this.destroy() );
		}
	}

	/**
	 * Генерация целого числа включая границы
	 * Для имитации броска 2 кубиков входные значения 2 и 12
	 */
	// @ts-ignore
	private _random(min: number, max: number) : number
	{
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	
	/**
	 * Разбирает полученное сообщение
	 * 
	 * @param data Полученное сообщение
	 */
	private _parseMessage( data: unknown ): AnyClientMessage
	{
		if ( typeof data !== 'string' )
		{
			return {
				type: 'incorrectRequest',
				message: 'Wrong data type',
			};
		}
		
		try
		{
			return JSON.parse( data );
		}
		catch ( error )
		{
			return {
				type: 'incorrectRequest',
				message: 'Can\'t parse JSON data: ' + error,
			};
		}
	}
	
	/**
	 * Выполняет действие, соответствующее полученному сообщению
	 * 
	 * @param player Игрок, от которого поступило сообщение
	 * @param message Сообщение
	 */
	private _processMessage( player: WebSocket, message: AnyClientMessage ): void
	{
		switch ( message.type )
		{
			case 'playerMove':
				this._onPlayerMove( player, message);
				break;
			
			case 'repeatGame':
				this._field = this._generateField();
				this._gameState = {
					players: [
						{
							points: 0,
							resources:{
								wood: 0,
								fur: 0,
								clay: 0,
								mountain: 0,
								field: 0,
							},
							color: 'white'
						},
						{
							points: 0,
							resources:{
								wood: 0,
								fur: 0,
								clay: 0,
								mountain: 0,
								field: 0,
							},
							color: 'blue'
						}
					],
					dice: 0,
					roads: [],
					villages: [],
					cities: [],
					color: 'white'
				};
				this._gameValues = {
					is_built_road: false,
					is_built_village: false,
					is_rolled: false,
					is_start: true
				};
				this._sendStartMessage()
					.catch( onError );
				break;
			
			case 'incorrectRequest':
				this._sendMessage( player, message )
					.catch( onError );
				break;
			
			case 'incorrectResponse':
				console.error( 'Incorrect response: ', message.message );
				break;
			
			default:
				this._sendMessage(
					player,
					{
						type: 'incorrectRequest',
						message: `Unknown message type: "${(message as AnyClientMessage).type}"`,
					},
				)
					.catch( onError );
				break;
		}
	}

	private _onPlayerMove(player: WebSocket, message: PlayerMoveMessage) : void
	{
		if (! this._checkMove(player) && message.action.name !== 'giveUp') return;
		switch(message.action.name){
			case "giveUp":
				this._giveUp(player);
				this._checkWin();
				return;

			case "build":
				this._onPlayerBuild(player, message.action);
				break;

			case "diceRoll":
				this._onPlayerDice(player);
				break;

			case "trade":
				this._onPlayerTrade(player, message.action);
				break;

			case "endTurn":
				this._onPlayerRoll(player);
				break;
		}

		for ( const player of this._session ) {
			this._sendMessage(
				player,
				{
					type: 'changePlayer',
					gameState: this._gameState,
					color: this._playersState.get(player)!
				},
			)
				.catch(onError);
		}

		this._checkWin();
	}

	private _giveUp(player : WebSocket) : void
	{
		let winner : WebSocket;
		for (const gamer of this._session) {
			if (gamer !== player) winner = gamer;
		}
		let color = this._playersState.get(winner!);
		color === 'white' ? this._gameState.players[0].points += 8 : this._gameState.players[1].points += 8;
	}

	private _onPlayerBuild(player: WebSocket, build: Build) : void
	{
		if (!this._gameValues.is_rolled && !this._gameValues.is_start) {
			this._onBadRequest('dice roll first', player);
			return;
		}
		switch (build.type) {
			case "road":
				this._buildRoad(player, build);
				break;
			case "village":
				this._buildVillage(player, build);
				break;
			case "city":
				this._buildCity(player, build);
				break;
		}
	}

	private _buildVillage(player: WebSocket, build: Build) : void
	{
		const color = this._playersState.get(player)!;
		let map = new Map(this._gameState.villages.map(i => [i.id, i.color]));
		if (map.has(build.place)) {
			this._onBadRequest('place already taken', player);
			return;
		}

		if (!this._checkPaths(color, build.place) && !this._gameValues.is_start) {
			this._onBadRequest('your road need to be joined to this village', player);
			return;
		}

		if (!this._checkDistance(build.place)) {
			this._onBadRequest('distance rule ignored', player);
			return;
		}

		if (!this._tryPlaceBuild(color, build))
		{
			this._onBadRequest('not enough resources', player);
			return;
		}
	}

	private _buildCity(player: WebSocket, build: Build) : void
	{
		const color = this._playersState.get(player)!;
		let map = new Map(this._gameState.cities.map(i => [i.id, i.color]));
		if (map.has(build.place)) {
			this._onBadRequest('place already taken', player);
			return;
		}

		map = new Map(this._gameState.villages.map(i => [i.id, i.color]));
		let playerVillageColor = map.get(build.place) as Color | null;
		if (playerVillageColor === null){
			this._onBadRequest('need village first', player);
			return;
		}
		if (playerVillageColor !== color) {
			this._onBadRequest('place already taken', player);
			return;
		}
		if (!this._tryPlaceBuild(color, build))
		{
			this._onBadRequest('not enough resources', player);
			return;
		}
	}

	private _buildRoad(player: WebSocket, build: Build) : void
	{
		const color = this._playersState.get(player)!;
		let map = new Map(this._gameState.roads.map(i => [i.id, i.color]));
		if (map.has(build.place)) {
			this._onBadRequest('place already taken', player);
			return;
		}
		if (!this._checkHouse(color, build.place))
		{
			if (!this._checkRoads(color, build.place)){
				this._onBadRequest('no buildings around', player);
				return;
			}
		}
		if (!this._tryPlaceBuild(color, build))
		{
			this._onBadRequest('not enough resources', player);
			return;
		}
	}

	private _checkDistance(nodeId: number) : boolean
	{
		let nodes = new Set<number>();
		let villages = new Map(this._gameState.villages.map(i => [i.id, i.color]));
		let cities = new Map(this._gameState.cities.map(i => [i.id, i.color]));
		for (let id of this._nodes[nodeId - 1].paths){
			if (id !== 0) {
				for (let node of this._paths[id - 1].nodes){
					nodes.add(node);
				}
			}
		}

		for (let id of nodes){
			if (villages.get(id) || cities.get(id)) return false;
		}
		return true;
	}

	private _checkPaths(color: Color, nodeId: number) : boolean
	{
		let tmp : Color | undefined;
		let roads = new Map(this._gameState.roads.map(i => [i.id, i.color]));
		for (let id of this._nodes[nodeId - 1].paths)
			if ((tmp = roads.get(id)) && tmp === color) return true;
		return false;
	}

	private _checkHouse(player: Color, pathId: number) : boolean
	{
		let mapV = new Map(this._gameState.villages.map(i => [i.id, i.color]));
		let mapC = new Map(this._gameState.cities.map(i => [i.id, i.color]));
		let path = this._paths[pathId - 1] as Path;
		let color : Color | undefined;
		for (let nodeId of path.nodes){
			if ((color = mapV.get(nodeId)) && color === player) return true;
			if ((color = mapC.get(nodeId)) && color === player) return true;
		}
		return false;
	}

	private _checkRoads(player: Color, pathId: number) : boolean
	{
		let map = new Map(this._gameState.roads.map(i => [i.id, i.color]));
		let allNodes = this._nodes as Array<Node>;
		let paths : Array<number> = new Array<number>();
		for (let node of allNodes) {
			for (let pathNum of node.paths) {
				if (pathNum === pathId) {
					node.paths.forEach(num => paths.push(num));
				}
			}
		}
		let color : Color | undefined;
		for (let path of paths) {
			if ((color = map.get(path)) && color === player) return true;
		}
		return false;
	}

	private _tryPlaceBuild(playerColor:Color, build : Build) : boolean
	{
		let playerResources : Resources = this._getPlayerResources(playerColor);
		const costResources : Resources = this._getCost(build.type);

		if (!this._gameValues.is_start) {
			if (playerResources.clay < costResources.clay
				|| playerResources.field < costResources.field
				|| playerResources.fur < costResources.fur
				|| playerResources.mountain < costResources.mountain
				|| playerResources.wood < costResources.wood)
				return false;

			playerResources.clay -= costResources.clay;
			playerResources.fur -= costResources.fur;
			playerResources.field -= costResources.field;
			playerResources.mountain -= costResources.mountain;
			playerResources.wood -= costResources.wood;
		}
		const pNum = this._gameState.players[0].color === playerColor ? 0 : 1;
		this._gameState.players[pNum].resources = playerResources;

		const newBuild : BuildState = {
			id: build.place,
			color: playerColor
		} ;
		switch (build.type) {
			case "road":
				if (this._gameValues.is_start) {
					if (playerColor == 'white') {
						if (this._gameState.roads.length % 2 === 1) return false;
					} else {
						if (this._gameState.roads.length % 2 === 0) return false;
					}
					this._gameValues.is_built_road = true;
				}
				this._gameState.roads.push(newBuild);
				break;
			case "village":
				if (this._gameValues.is_start) {
					if (playerColor == 'white') {
						if (this._gameState.villages.length % 2 === 1) return false;
					} else {
						if (this._gameState.villages.length % 2 === 0) return false;
					}
					this._gameValues.is_built_village = true;
				}
				this._gameState.villages.push(newBuild);
				this._gameState.players[pNum].points += 1;
				break;
			case "city":
				if (this._gameValues.is_start) return false;
				let num = this._gameState.villages.map(function(e) {return e.id}).indexOf(newBuild.id);
				if (num > -1) this._gameState.villages.splice(num, 1);
				this._gameState.cities.push(newBuild);
				this._gameState.players[pNum].points += 1;
				break;
		}
		return true;
	}

	private _getCost(building : Building) : Resources
	{
		return buildCost[building];
	}

	private _onPlayerDice(player: WebSocket) : void
	{
		if (this._gameValues.is_rolled) {
			this._onBadRequest('you already did this', player);
			return;
		}
		if (this._gameValues.is_start) {
			this._onBadRequest('first two moves only free road and village placement', player);
			return;
		}
		this._gameValues.is_rolled = true;
		this._gameState.dice = this._random(2, 12);
		let mapC : Map<number, Color> = new Map(this._gameState.cities.map(i => [i.id, i.color]));
		let mapV : Map<number, Color> = new Map(this._gameState.villages.map(i => [i.id, i.color]));
		let tmp : Color | undefined;
		let index : number;
		let array : Array<[Color, ResourcesNames, number]> = new Array<[Color, ResourcesNames, number]>();
		let hexesArray = this._hexes.filter(hex => hex.token === this._gameState.dice);
		hexesArray.forEach(hex =>{
			hex.nodes.forEach(node => {
				if ((tmp = mapC.get(node))) array.push([tmp, <ResourcesNames>hex.resource, 2]);
				if ((tmp = mapV.get(node))) array.push([tmp, <ResourcesNames>hex.resource, 1]);
			})
		});
		for (let [color, resource, add] of array){
			index = color === 'white' ? 0 : 1;
			switch (resource) {
				case "fur":
					this._gameState.players[index].resources.fur += add;
					break;
				case "clay":
					this._gameState.players[index].resources.clay += add;
					break;
				case "wood":
					this._gameState.players[index].resources.wood += add;
					break;
				case "mountain":
					this._gameState.players[index].resources.mountain += add;
					break;
				case "field":
					this._gameState.players[index].resources.field += add;
					break;
			}
		}
	}

	private _onPlayerTrade(player: WebSocket, trade: Trade) : void
	{
		const color = this._playersState.get(player)!;
		if (trade.from === trade.to) {
			this._onBadRequest('trade objects are the same', player);
			return;
		}

		if (trade.coefficient < 4) {
			if (!this._checkSpecialNodes(color, trade.from, trade.coefficient)){
				this._onBadRequest('you haven\'t special buildings in port for this type of change', player);
				return;
			}
		}
		if (!this._tryTrade(trade.coefficient, trade.from, trade.to, color)) {
			this._onBadRequest('not enough resources', player);
			return;
		}
	}

	private _tryTrade(coefficient: number, from: ResourcesNames, to: ResourcesNames, color: Color) : boolean
	{
		let num = color === 'white' ? 0 : 1;
		let isBad : boolean = false;
		switch(from) {
			case 'fur':
				if (this._gameState.players[num].resources.fur >= coefficient) {
					this._gameState.players[num].resources.fur -= coefficient;
				} else isBad = true;
				break;

			case 'field':
				if (this._gameState.players[num].resources.field >= coefficient) {
					this._gameState.players[num].resources.field -= coefficient;
				} else isBad = true;
				break;

			case 'mountain':
				if (this._gameState.players[num].resources.mountain >= coefficient) {
					this._gameState.players[num].resources.mountain -= coefficient;
				} else isBad = true;
				break;

			case 'clay':
				if (this._gameState.players[num].resources.clay >= coefficient) {
					this._gameState.players[num].resources.clay -= coefficient;
				} else isBad = true;
				break;

			case 'wood':
				if (this._gameState.players[num].resources.wood >= coefficient) {
					this._gameState.players[num].resources.wood -= coefficient;
				} else isBad = true;
				break;
			default:
				return false;
		}
		if (!isBad)
		switch (to) {
			case 'fur':
				this._gameState.players[num].resources.fur += 1;
				return true;

			case 'field':
				this._gameState.players[num].resources.field += 1;
				return true;

			case 'mountain':
				this._gameState.players[num].resources.mountain += 1;
				return true;

			case 'clay':
				this._gameState.players[num].resources.clay += 1;
				return true;

			case 'wood':
				this._gameState.players[num].resources.wood += 1;
				return true;

			default:
				break;
		}
		return false;
	}

	private _checkSpecialNodes(color : Color, to : ResourcesNames, coefficient: number) : boolean
	{
		let mapV : Map<number, Color> = new Map(this._gameState.villages.map(i => [i.id, i.color]));
		let mapC : Map<number, Color> = new Map(this._gameState.cities.map(i => [i.id, i.color]));
		let tmp : Color | undefined;
		if (coefficient === 3) {
			for (let node of this._specialNodes) {
				if ((tmp = mapV.get(node)!) && tmp === color) return true;
				if ((tmp = mapC.get(node)!) && tmp === color) return true;
			}
		} else {
			let source = [0, 0];
			switch(to) {
				case 'fur':
					source = this._furNodes;
					break;

				case 'field':
					source = this._fieldNodes;
					break;

				case 'mountain':
					source = this._mountainNodes;
					break;

				case 'clay':
					source = this._clayNodes;
					break;

				case 'wood':
					source = this._woodNodes;
					break;
				default:
					break;
			}
			for (let src of source) {
				if ((tmp = mapV.get(src)) && tmp === color) return true;
				if ((tmp = mapC.get(src)) && tmp === color) return true;
			}
		}

		return false;
	}

	private _getPlayerResources(player : Color) : Resources
	{
		return player === 'white' ? this._gameState.players[0].resources : this._gameState.players[1].resources;
	}

	private _onBadRequest(message: string, player: WebSocket) : void
	{
		this._sendMessage(
			player,
			{
				type: 'incorrectRequest',
				message: message,
			},
		)
			.catch( onError );

	}

	private _checkMove(currentPlayer: WebSocket) : boolean
	{
		if ( this._currentMove != currentPlayer )
		{
			this._sendMessage(
				currentPlayer,
				{
					type: 'incorrectRequest',
					message: 'Not your turn',
				},
			)
				.catch( onError );

			return false;
		}

		return true;
	}

	private _maxPoints() : [Color, number] | null {
		let pointsP1 = this._gameState.players[0].points;
		let pointsP2 = this._gameState.players[1].points;
		if (pointsP1 < 8)
			if (pointsP2 < 8)
				return null;
		if (pointsP1 > pointsP2)
			return ['white', pointsP1];
		else
			return ['blue', pointsP2];
	}

	private _checkWin() : void
	{
		let winner : [Color, number] | null = this._maxPoints();
		if (winner === null) return;
		for ( const player of this._session )
		{
			this._sendMessage(
				player,
				{
					type: 'gameResult',
					win: ( this._playersState.get(player) === winner[0] ),
				},
			)
				.catch( onError );
		}
	}

	private giveFreeResources(player : WebSocket) : void
	{
		let color = this._playersState.get(player);
		let num = color === 'white' ? 0 : 1;
		let nodes : Set<number> = new Set<number>();
		let resources : Array<ResourcesNames> = new Array<ResourcesNames>();
		this._gameState.villages.forEach(village => {
			if (village.color === this._playersState.get(player)) nodes.add(village.id);
		});

		this._hexes.forEach(hex => {
			hex.nodes.forEach(node => {
				if (nodes.has(node)) resources.push(<ResourcesNames>hex.resource);
			});
		});

		resources.forEach((resource : ResourcesNames) => {
			switch (resource){
				case "clay": this._gameState.players[num].resources.clay += 1; break;
				case "fur": this._gameState.players[num].resources.fur += 1; break;
				case "mountain": this._gameState.players[num].resources.mountain += 1; break;
				case "field": this._gameState.players[num].resources.field += 1; break;
				case "wood": this._gameState.players[num].resources.wood += 1; break;
			}
		})
	}

	/**
	 * Обрабатывает ход игрока
	 *
	 */
	private _onPlayerRoll( player : WebSocket): void
	{
		if (!this._gameValues.is_start) {
			if (!this._gameValues.is_rolled) {
				this._onBadRequest('have to roll first', player);
				return;
			}
		} else if (!this._gameValues.is_built_village) {
			this._onBadRequest('have to build village first', player);
			return;
		} else if (!this._gameValues.is_built_road){
			this._onBadRequest('have to build road first', player);
			return;
		}

		if (this._gameValues.is_start && this._gameState.villages.length > 2){
			this.giveFreeResources(player);
		}

		this._gameValues.is_built_road = false;
		this._gameValues.is_built_village = false;
		this._gameValues.is_rolled = false;
		if (this._gameValues.is_start && this._gameState.roads.length === 4) this._gameValues.is_start = false;

		let player2 : WebSocket | null = null;
		for ( const man of this._session )
		{
			if (man !== player) player2 = man;
		}
		this._gameState.color = this._playersState.get(player2!)!;
		this._currentMove = player2!;
	}
}

export {
	Game,
};
