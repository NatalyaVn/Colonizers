# Colonizers

Игра "Колонизаторы", включающая в себя:

* сервер HTTP для выдачи статики;
* WebSocket`ы для поддержания соединения с игроками.

## Правила игры
Действия совершаются поочередно в свой ход. Первый ход за белым игроком.

Ход начинается с броска кубика (исключение см. ниже), после которого игрокам, в зависимости от числа, выпавшего на кубике, выдаются ресурсы с гексов, на вершинах которых стоят здания игроков, если токен на гексе совпадает с числом на кубиках.

Если у игрока достаточно ресурсов для постройки, то он может после выбора вида постройки кликнуть по игровой карте, где он желал бы разместить её.

За размещение зданий игрокам начисляются баллы.

Если у игрока достаточно ресурсов для торговли, то он может совершить обмен, при этом ресурсы (что меняет и на что) должны отличаться. Для совершения обменов вида _3 к 1_ или _2 к 1_ у игрока должны быть размещены здания на портовых вершинах, а именно на вершине _"3:1"_ для обмена по курсу первого вида, и на вершинах соответствующих виду ресурсов для торговли (что меняет) для второго вида обмена. Для торговли _4 к 1_ необходимости в портовых постройках нет.

Ход завершается после нажатия на кнопку _"Завершить ход"_.

Игра завершается, как только один из игроков набирает победные 8 баллов или нажимает на кнопку _"Сдаться"_.

### Начало игры

В свои первые два хода игроки обязаны поставить бесплатно дом и дорогу (именно в такой последовательности) по 1 единице постройки каждого вида за ход. В эти 4 хода бросок кубиков недоступен.

В конце 2 хода игроку начисляется по 1 единице ресурса с гексов, на вершинах которых находятся его здания.

### Виды построек в игре

1. Дорога
    * _место размещения_: 
        * на ребре гекса
    * _правило размещения_: 
        * по соседству есть постройка игрока
    * _стоимость размещения_:
        * древесина : 1
        * глина : 1
        
2. Поселение
    * вид:
        * здание
    * _место размещения_: 
        * на вершине гекса
    * _правило размещения_: 
        * по соседству есть дорога игрока
        * по соседству нет зданий
    * _стоимость размещения_:
        * древесина : 1
        * глина : 1
        * шерсть : 1
        * зерно : 1
    * _количество начисляемых баллов_:
        * 1 балл
3. Город
    * вид:
        * здание
    * _место размещения_: 
        * на вершине гекса
    * _правило размещения_: 
        * на месте размещения есть поселение игрока
    * _стоимость размещения_:
        * руда : 3
        * зерно : 2
    * _количество начисляемых баллов_:
        * 2 балла

## Запуск

Устанавливаем зависимости:
```
npm i
```

Запускаем сборку:
```
npm run build
```

Запускаем сервер:
```
npm start
```

## Подключение игроков

В браузере открываем http://localhost:8000/

Игра начинается при подключении двух игроков.