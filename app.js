'use strict';

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const rooms = [];    //массив комнат, каждая из которых нужна, для проведения партии между двумя оппонентами
let turnCount = 0;   //необходим для распознания ничьи 

app
    .set('port', (process.env.PORT || 4000))
    .use('/', express.static(__dirname + '/public'));

//в момент подклчения какого-либо пользователя находит ему пустую комнату для игры
//или создает новую и помещает туда игрока. если в комнате уже кто-то есть, игра начинается
//в противном случае, игрок ждёт
io.on('connection', socket => {
    let found = false;
    let current;
    let x = {
        val: 'x',
        canTurn: true
    };
    let o = {
        val: 'o',
        canTurn: false
    };

    for(let i = 0, max = rooms.length; i < max; i++) {  
        if(rooms[i].length < 2) {
            found = true;
            current = i;
            console.log(`Room ${current} found.`);
        }
    }
    if(found === false) {       
        rooms.push([]);
        current = rooms.length - 1;
        console.log(`A ${current} room created`);
    }

    rooms[current].push(socket);    
    socket.emit('connected', current);  
    console.log(`Connected to the ${current} room`);

    if(rooms[current].length < 2) {         
        socket.emit('wait');
    } else {
        rooms[current][0].emit('start', x);
        rooms[current][1].emit('start', o);
    }

    socket
        //во время дисконнекта одного из игроков, отправляем информацию об этом оппоненту
        //если игрок вышел из комнаты будучи там один, комната освобождается
        .on('disconnect', () => {
            if(rooms[current].length === 2) {
                io.emit('opp-disc');
                if(rooms[current][0].disconnected) {
                    rooms[current].shift();
                } else if(rooms[current][1].disconnected) {
                    rooms[current].pop();
                }                
            } else {
                rooms[current] = [];
            }
        })
        //вызывается, если игрок нажал на клетку во время своего хода. после вызова, меняем ходящего игрока
        .on('turn', data => {
            turnCount++;
            if(data.player.val === 'x') {
                o.canTurn = true;
                x.canTurn = false;
            } else if(data.player.val === 'o') {
                o.canTurn = false;
                x.canTurn = true;
            }
            rooms[current][0].emit('turn',data,x.canTurn,turnCount);
            rooms[current][1].emit('turn',data,o.canTurn,turnCount);
        })
        //вызывается в момент ничьи. обнуляет счетчик ходов
        .on('draw', () => turnCount = 0)
        //вызывается после проверки окончания игры. обнуляет счетчик ходов
        .on('end', winner => {
            turnCount = 0;
            rooms[current][0].emit('end',winner);
            rooms[current][1].emit('end',winner);
        });

});

http.listen(app.get('port'), {host: 'mvvtictac.herokuapp.com', path: '/'});

