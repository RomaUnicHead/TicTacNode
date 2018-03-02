'use strict';

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const rooms = [];
let turnCount = 0;

app
    .use('/', express.static(__dirname + '/public'))
    .set('port', (process.env.PORT || 4000));

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

    for(let i = 0, max = rooms.length; i < max; i++) {  //при подключении пытаемся найти пустою комнату
        if(rooms[i].length < 2) {
            found = true;
            current = i;
            console.log('Room found.');
        }
    }
    if(found === false) {         //если все комнаты заняты, создаём новую
        rooms.push([]);
        current = rooms.length - 1;
        console.log('A new room created');
    }

    rooms[current].push(socket);    //в комнату добавляем игрока
    socket.emit('connected', current);  //и отправляем номер комнаты клиенту
    console.log(`Connected to the ${current} room`);

    if(rooms[current].length < 2) {         //начинаем игру только если в комнате 2 игрока
        socket.emit('wait');
    } else {
        rooms[current][0].emit('start', x);
        rooms[current][1].emit('start', o);
    }

    socket
        .on('disconnect', () => {                     //при вылете одного из оппонентов эмитим другому евент 'opp-disc'
            let tempSockets = [rooms[current][0], rooms[current][1]];

            rooms[current] = [];
            tempSockets.forEach((socket) => {
                if(socket !== undefined) {
                    socket.emit('opp-disc');
                }
            });
        })
        .on('end', () => {
            turnCount = 0;
            rooms[current][0].emit('end');
            rooms[current][1].emit('end');
        })
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
        });

});

http.listen(app.get('port'), {host: 'mvvtictac.herokuapp.com', path: '/'});

