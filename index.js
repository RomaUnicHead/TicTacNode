"use strict";

const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const { join } = require("path");
const PORT = process.env.PORT || 4000;

const rooms = [];
let turnCount = 0;

app.use(express.static(join(__dirname, "public")));
	
function findRoom(rooms) {
	let current;
    let found = false;
	
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

	return current;
}	

io.on("connection", function(socket) {
    let x = {
        val: "x",
        canTurn: true
    };
    let o = {
        val: "o",
        canTurn: false
    };
    let current = findRoom(rooms);
	
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
        .on("draw", function() {
            turnCount = 0;
        })
        .on("end", function(winner) {
            turnCount = 0;
            rooms[current].forEach((player) => player.emit("end", winner));
        })
        .on("new message", (sender,text) => rooms[current].forEach((player) => player.emit("new message", sender, text)))
        .on("show rooms", function() {
            let sendDataRooms = rooms.map((room) => room.map((x) => x.nickname));
            socket.emit("show rooms", sendDataRooms);
        })
        .on("set nickname", (nickname) => socket.nickname = nickname);
});

http.listen(PORT);
