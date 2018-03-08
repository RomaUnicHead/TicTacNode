"use strict";

const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const { join } = require("path");
const PORT = process.env.PORT || 4000;

const rooms = [];
let turnCount = 0;

app
    .use('/',express.static(join(__dirname, "public")));

//при подключении игрок попадает в пустую комнату или, если таковой нету, создает новую
io.on("connection", function(socket) {
    let found = false;
    let current;
    let x = {
        val: "x",
        canTurn: true
    };
    let o = {
        val: "o",
        canTurn: false
    };

    for(let i = 0, max = rooms.length; i < max; i++) {
        if(rooms[i].length < 2) {
            found = true;
            current = i;
            console.log(`Room ${current} found.`);
            break;
        }
    }

    if(found === false) {
        rooms.push([]);
        current = rooms.length - 1;
        console.log(`A ${current} room created`);
    }

    rooms[current].push(socket);
    socket.emit("connected", current);
    console.log(`Connected to the ${current} room`);

    if(rooms[current].length < 2) {
        socket.emit("wait");
    } else {
        rooms[current][0].emit("start", x);
        rooms[current][1].emit("start", o);
    }

    socket
        //во время дисконнекта одного из игроков, отправляем информацию об этом оппоненту
        //если игрок вышел из комнаты будучи там один, комната освобождается
        .on("disconnect", function() {
            if(rooms[current].length === 2) {
                if(rooms[current][0].disconnected) {
                    rooms[current].shift();
                } else if(rooms[current][1].disconnected) {
                    rooms[current].pop();
                }
                rooms[current][0].emit("opp disconnected");
            } else {
                rooms[current] = [];
            }
        })
        //обработка хода
        .on("turn", function(data) {
            turnCount++;
            if(data.player.val === "x") {
                o.canTurn = true;
                x.canTurn = false;
            } else if(data.player.val === "o") {
                o.canTurn = false;
                x.canTurn = true;
            }
            rooms[current][0].emit("turn",data,x.canTurn,turnCount);
            rooms[current][1].emit("turn",data,o.canTurn,turnCount);
        })
        //вызывается в момент ничьи
        .on("draw", function() {
            turnCount = 0;
        })
        //вызывается после проверки на окончание игры
        .on("end", function(winner) {
            turnCount = 0;
            rooms[current].forEach((player) => player.emit("end", winner));
        })
        //обработка сообщений
        .on("new message", (sender,text) => rooms[current].forEach((player) => player.emit("new message", sender, text)))
        //при вызове, возвращает количество игроков в каждой комнате
        .on("show rooms", function() {
            let sendDataRooms = rooms.map((room) => room.map((x) => x.nickname));
            console.log(sendDataRooms);
            socket.emit("show rooms", sendDataRooms);
        })
        .on("set nickname", (nickname) => socket.nickname = nickname);
});

http.listen(PORT, {host: "mvvtictac.herokuapp.com", path: "/"});
