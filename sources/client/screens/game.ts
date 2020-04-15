import {
	Build,
	Building,
	BuildState,
	Color,
	DiceRoll,
	EndTurn,
	GameState,
	GiveUp,
	PlayerAction,
	ResourcesNames,
	Trade
} from "../../common/messages";

const hexes = document.querySelectorAll<HTMLElement>(".hex");
const turn = document.querySelector('#turn') as HTMLElement;
const endTurn = document.querySelector('#endTurn') as HTMLElement;
const diceRoll = document.querySelector('#diceRoll') as HTMLElement;
const loginP1 = document.querySelector('#loginP1') as HTMLElement;
const loginP2 = document.querySelector('#loginP2') as HTMLElement;
const pointsP1 = document.querySelector('#pointsP1') as HTMLElement;
const pointsP2 = document.querySelector('#pointsP2') as HTMLElement;
const cardsP1 = document.querySelector('#cardsP1') as HTMLElement;
const cardsP2 = document.querySelector('#cardsP2') as HTMLElement;
const woodCards = document.querySelector('#wood') as HTMLElement;
const furCards = document.querySelector('#fur') as HTMLElement;
const clayCards = document.querySelector('#clay') as HTMLElement;
const mountainCards = document.querySelector('#mountain') as HTMLElement;
const fieldCards = document.querySelector('#field') as HTMLElement;
const buttons = document.querySelectorAll<HTMLElement>('.mebat');
const buttonsTrade = document.querySelectorAll<HTMLElement>('.trade');
const trade = document.querySelector('#trade') as HTMLElement;
const closeTrade = document.querySelector('#closeTrade') as HTMLElement;
const sendTrade = document.querySelector('#sendTrade') as HTMLElement;
const tradeFromResources = document.querySelectorAll<HTMLElement>('.mat');
const tradeToResources = document.querySelectorAll<HTMLElement>('.mat2');
const giveUp = document.querySelector('#btn_red_large') as HTMLElement;
const paths = document.querySelectorAll<HTMLElement>('.paths');
const nodes = document.querySelectorAll<HTMLElement>('.crossroads');
const numberDice = document.querySelector('#numberDice') as HTMLElement;
const game = document.querySelector('.game') as HTMLElement;

if ( !turn || !endTurn || !diceRoll || hexes.length <= 0 || !loginP1 || !loginP2 || !pointsP1 || !pointsP2
	|| !cardsP1 || !cardsP2 || !woodCards || !furCards || !clayCards || !mountainCards || !fieldCards
	|| buttons.length <= 0 || buttonsTrade.length <= 0 || !trade || !closeTrade || !sendTrade
	|| tradeFromResources.length <= 0 || tradeToResources.length <= 0 || !giveUp || paths.length <= 0
	|| nodes.length <= 0 || !numberDice || !game)
{
	throw new Error( 'Can\'t find required elements on "game" screen' );
}

let gameState: GameState = {
	players:
		[{
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
		}],
	dice: 0,
	roads: [],
	villages: [],
	cities: [],
	color: 'white'
};
let tradeState : Trade = {
	name: 'trade',
	coefficient: 0,
	from: 'none',
	to: 'none'
};

endTurn.addEventListener('click', onTurnClick);
diceRoll.addEventListener('click', onDiceClick);
closeTrade.addEventListener('click', onCloseTrade);
sendTrade.addEventListener('click', onTrade);
giveUp.addEventListener('click', onGiveUpClick);

buttonsTrade.forEach(function(button){
	button.addEventListener('click', onTradeClick);
});
tradeFromResources.forEach(function(material){
	material.addEventListener('click', onSelectMaterialClick);
});
tradeToResources.forEach(function(material){
	material.addEventListener('click', onSelectMaterialClick);
});
paths.forEach(function(path){
	path.addEventListener('click', onPathClick);
});
nodes.forEach(function(node){
	node.addEventListener('click', onNodeClick);
});

document.addEventListener('mouseup', function(e) {
	const div = document.querySelector(".bat") as HTMLElement;
	e = e || window.event;
	let target = e.target || e.srcElement;
	// @ts-ignore
	if (!div.contains(target)){
		let array = Array.from(document.getElementsByClassName("mebat"));
		array.forEach(button => {
			button.classList.remove("active");
			button.classList.add("notactive");
			if (+button.getAttribute("key")! == 0)
				button.setAttribute("wasActive", "0");
			else
				button.setAttribute("key", "0");
		});
	}
}, true);

function onTurnClick() : void {
	const endTurn : EndTurn = {
		name:'endTurn'
	};
	turnHandler && turnHandler(endTurn);
}

function onDiceClick() : void {
	const diceRoll : DiceRoll = {
		name: 'diceRoll'
	};
	turnHandler && turnHandler(diceRoll);
}

/**
 * Обработчик хода игрока
 */
type TurnHandler = ( action: PlayerAction ) => void;

/**
 * Обработчик хода игрока
 */
let turnHandler: TurnHandler;

/**
 * Обновляет экран игры
 * @param game
 * @param color
 */
function update(game: GameState, color : Color): void {
	gameState = game;

	const myNum = gameState.players[0].color === color ? 0 : 1;
	const nmyNum = myNum === 0 ? 1 : 0;

	pointsP1.textContent = gameState.players[myNum].points.toString();
	pointsP2.textContent = gameState.players[nmyNum].points.toString();

	let myCardsNum : number = 0;
	let nmyCardsNum : number = 0;

	myCardsNum += gameState.players[myNum].resources.wood;
	woodCards.textContent = gameState.players[myNum].resources.wood.toString();
	myCardsNum += gameState.players[myNum].resources.fur;
	furCards.textContent = gameState.players[myNum].resources.fur.toString();
	myCardsNum += gameState.players[myNum].resources.clay;
	clayCards.textContent = gameState.players[myNum].resources.clay.toString();
	myCardsNum += gameState.players[myNum].resources.mountain;
	mountainCards.textContent = gameState.players[myNum].resources.mountain.toString();
	myCardsNum += gameState.players[myNum].resources.field;
	fieldCards.textContent = gameState.players[myNum].resources.field.toString();

	nmyCardsNum += gameState.players[nmyNum].resources.wood;
	nmyCardsNum += gameState.players[nmyNum].resources.fur;
	nmyCardsNum += gameState.players[nmyNum].resources.clay;
	nmyCardsNum += gameState.players[nmyNum].resources.mountain;
	nmyCardsNum += gameState.players[nmyNum].resources.field;

	cardsP1.textContent = myCardsNum.toString();
	cardsP2.textContent = nmyCardsNum.toString();

	for (let build of gameState.villages) placeBuilding(build, 'village');

	for (let build of gameState.cities) placeBuilding(build, 'city');

	for (let build of gameState.roads) placeRoad(build);

	numberDice.textContent = gameState.dice.toString();

	if (gameState.color === color) {
		turn.textContent = "Ваш ход";
		return;
	}
	turn.textContent = " Ждите ";
}

function placeBuilding(build: BuildState, type: Building) : void {
	if (type === 'village' && document.querySelector('#nv' + build.id)
		|| type === 'city' && document.querySelector('#nc' + build.id)) return;
	let left : number;
	let top : number;
	let coord : string;
	let name: string;
	let source : string;
	let element = document.querySelector("#n"+ build.id) as HTMLElement;
	let newEl = document.createElement("img");

	name = "build img_0";
	if (type === 'village'){
		left = +element.getAttribute("cx")! - 16;
		top = +element.getAttribute("cy")! - 16;
		source = "img/new_village_";
		newEl.id = "nv" + build.id;
	}
	else {
		let toDel = document.querySelector('#nv' + build.id) as Node | undefined;
		if (toDel) game.removeChild(toDel);
		left = +element.getAttribute("cx")! - 25;
		top = +element.getAttribute("cy")! - 23.5;
		source = "img/new_city_";
		newEl.id = "nc" + build.id;
	}
	coord = "left:" + left + "px;top:" + top + "px";

	source += build.color + '.png';

	newEl.setAttribute("src", source);
	newEl.setAttribute("class", name);
	newEl.setAttribute("style", coord);

	game.appendChild(newEl);
}

function placeRoad(build: BuildState) : void {
	if (document.querySelector('#nr' + build.id)) return;
	let name : string;
	let coord : string;
	let angle : string;
	let source : string = 'img/road_' + build.color + '_vert.png';
	let element = document.getElementById("r"+ build.id) as HTMLElement;
	let newEl : HTMLElement = document.createElement("img");
	let left : number = +element.getAttribute("cx")! - 30;
	let top : number = +element.getAttribute("cy")! - 30;

	coord = "left:" + left + "px;top:" + top + "px";

	name = "road ";
	angle = element.getAttribute("class")!;
	if (angle.indexOf("angle60") > -1){
		name += "img_60";
	}
	else if (angle.indexOf("angle120") > -1){
		name += "img_120";
	}
	else name += "img_0";

	newEl.setAttribute("src", source);
	newEl.setAttribute("class", name);
	newEl.setAttribute("style", coord);
	newEl.id = "nr" + build.id;

	game.appendChild(newEl);
}

function setField(field: Array<[number, ResourcesNames]>, color : Color) : void {
	let text : string;
	for(let i = 0; i < hexes.length; i++)
	{
		text = "";
		for (let j = 0; j < field.length; j++){
			if (+hexes[i].id == field[j][0]) {
				text = "img/" + field[j][1] + ".png";
				break;
			}
		}
		let elem  = hexes[i].children[0].children[0] as HTMLInputElement;
		if (+hexes[i].id != 100 && elem) elem.src = text;
	}

	loginP1.textContent = color === 'white' ? 'Белый' : 'Синий';
	loginP2.textContent = color !== 'white' ? 'Белый' : 'Синий';

	buttons.forEach( function(button){
		button.addEventListener('click', onMebatClick);
		if (color !== 'blue'){
			let elem = button.children[0] as HTMLInputElement;
			elem.src = elem.src.replace('blue', 'white');
		}
	});
}

function onGiveUpClick() : void {
	let action : GiveUp = {
		name: 'giveUp',
		color: (loginP1.textContent === 'Белый' ? 'white' : 'blue')
	};
	turnHandler && turnHandler(action);
}

function onMebatClick(this: HTMLElement){
	let array = Array.from(document.querySelectorAll<HTMLElement>(".mebat"));
	if (+this.getAttribute("key")! == 0){
		array.forEach(button => {
			button.classList.remove("active");
			button.classList.add("notactive");
			button.setAttribute("key", "0");
		});
		this.classList.remove("notactive");
		this.classList.add("active");
		this.setAttribute("key", "1");
		this.setAttribute("wasActive", "1");
	}
	else {
		array.forEach(button => {
			button.classList.remove("active");
			button.classList.add("notactive");
			button.setAttribute("key", "0");
		});
		this.setAttribute("wasActive", "0");
	}
}

function onTradeClick(this: HTMLElement) : void {
	trade.style.display = "block";
	let text = this.children[0].getAttribute('src')!;
	tradeState.coefficient = +this.getAttribute('id')!.substr(1);
	document.getElementById("tradeImg")!.children[0].setAttribute("src", text);
}

function onCloseTrade() : void {
	trade.style.display='none';
	let element = document.querySelector('.activeMat');
	let element2 = document.querySelector('.activeMat2');
	if (element) element.classList.remove("activeMat");
	if (element2) element2.classList.remove("activeMat2");
	tradeState.from = 'none';
	tradeState.to = 'none';
}

function onSelectMaterialClick(this: HTMLElement){
	if (this.getAttribute("class") == "mat"){
		tradeState.from = <ResourcesNames>this.getAttribute("id")!.substr(2);
		let el = document.querySelector(".activeMat") as HTMLElement | null;
		if (el !== null) el.classList.remove("activeMat");
		this.classList.add("activeMat");
	}
	else {
		tradeState.to = <ResourcesNames>this.getAttribute("id")!.substr(2);
		let el = document.querySelector(".activeMat2") as HTMLElement | null;
		if (el !== null) el.classList.remove("activeMat2");
		this.classList.add("activeMat2");
	}
}

function onPathClick(this: HTMLElement) : void {
	let roadOption = document.getElementById("hoverRoad")!.getAttribute("wasActive")!;
	if (+roadOption == 0) return;
	const action : Build = {
		name: 'build',
		place: +this.id.substr(1),
		type: 'road'
	};
	turnHandler && turnHandler(action);
}

function onNodeClick(this: HTMLElement) : void {
	let villageOption = document.getElementById("hoverVillage")!.getAttribute("wasActive")!;
	let cityOption = document.getElementById("hoverCity")!.getAttribute("wasActive")!;
	if (+villageOption + +cityOption === 0) return;
	const action : Build = {
		name: 'build',
		place: +this.id.substr(1),
		type: +villageOption === 1 ? 'village' : 'city'
	};
	turnHandler && turnHandler(action);
}

function remove() : void {
	gameState.villages.forEach(build => {
		let element = document.querySelector("#nv" + build.id) as HTMLElement;
		game.removeChild(element);
	});
	gameState.roads.forEach(build => {
		let element = document.querySelector("#nr" + build.id) as HTMLElement;
		game.removeChild(element);
	});
	gameState.cities.forEach(build => {
		let element = document.querySelector("#nc" + build.id) as HTMLElement;
		game.removeChild(element);
	});
}

function onTrade() : void {
	if (tradeState.from === 'none' || tradeState.to === 'none') {
		onCloseTrade();
		return;
	}
	const action : Trade = {
		name: 'trade',
		from: tradeState.from,
		to: tradeState.to,
		coefficient: tradeState.coefficient
	};
	turnHandler && turnHandler(action);
	onCloseTrade();
}

/**
 * Устанавливает обработчик хода игрока
 *
 * @param handler Обработчик хода игрока
 */
function setTurnHandler(handler: TurnHandler): void {
	turnHandler = handler;
}

export {
	update,
	remove,
	setField,
	setTurnHandler
};