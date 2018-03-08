const tictac = (function TicTacNode() {
    "use strict";

    const cells = document.querySelectorAll("td");
    const status = document.getElementById("status");
    const sendMsgBtn = document.getElementById("message-text");
    const chatWindow = document.getElementById("chat-window");
    const roomBtn = document.getElementById("show-rooms-btn");
    const roomList = document.getElementById("room-list");
    const nicknameWindow = document.getElementById("nickname-setup");
    const socket = io();

    let player = {};
    let gameStarted = false;
    let roomBtnShown = false;
    let roomBtnClicked = false;

    document.addEventListener("keydown", function(e) {
        if(e.keyCode === 13) {
            const nickname = document.getElementById("nickname").value;
            if(!player.nickname && nickname !== '') {                   
                nicknameWindow.style.left = "-100%";    
                player.nickname = nickname;
                socket.emit("set nickname", player.nickname);
            }
            sendMessage();
        }
    });

    roomBtn.onclick = function() {
        if(roomBtnClicked === false) {
            socket.emit("show rooms");
            roomBtnClicked = true;
        } else {
            roomList.style.display = "none";
            roomBtnClicked = false;
        }
    };

    roomList.onclick = function() {
        roomList.style.display = "none";
    };

    cells.forEach(function(cell, i) {
        cell.onclick = function() {
            if (cell.innerHTML === "" && gameStarted && player.canTurn) {
                let data = {
                    player: player,
                    index: i
                };
                socket.emit("turn", data);
            }
        };
    });

    function sendMessage() {
        if(sendMsgBtn.value !== "" && gameStarted) {
            socket.emit("new message", player.nickname, sendMsgBtn.value);
            sendMsgBtn.value = "";
        }
    }

    function resetBoard() {
        cells.forEach(function(cell) {
            cell.innerHTML = "";
        });
    }

    function end() {
        return (
            (cells[0].innerHTML === cells[1].innerHTML && cells[1].innerHTML === cells[2].innerHTML && cells[2].innerHTML !== "")||
            (cells[3].innerHTML === cells[4].innerHTML && cells[4].innerHTML === cells[5].innerHTML && cells[5].innerHTML !== "")||
            (cells[6].innerHTML === cells[7].innerHTML && cells[7].innerHTML === cells[8].innerHTML && cells[8].innerHTML !== "")||
            (cells[0].innerHTML === cells[3].innerHTML && cells[3].innerHTML === cells[6].innerHTML && cells[6].innerHTML !== "")||
            (cells[1].innerHTML === cells[4].innerHTML && cells[4].innerHTML === cells[7].innerHTML && cells[7].innerHTML !== "")||
            (cells[2].innerHTML === cells[5].innerHTML && cells[5].innerHTML === cells[8].innerHTML && cells[8].innerHTML !== "")||
            (cells[0].innerHTML === cells[4].innerHTML && cells[4].innerHTML === cells[8].innerHTML && cells[8].innerHTML !== "")||
            (cells[2].innerHTML === cells[4].innerHTML && cells[4].innerHTML === cells[6].innerHTML && cells[6].innerHTML !== "")
        );
    }

    socket
        .on("connected", function(roomNum) {
            roomBtn.innerHTML = "Комната: " + roomNum;
        })
        .on("wait", function() {
            status.innerHTML = "Ждём второго игрока";
        })
        .on("start", function(pl) {
            chatWindow.innerHTML = "";
            player = pl;
            gameStarted = true;
            if(player.canTurn) {
                status.innerHTML = "Ваш ход";
            } else {
                status.innerHTML = "Ход оппонента";
            }
        })
        .on("opp disconnected", function() {
            status.innerHTML = "Ваш оппонент вылетел. Ждём нового.";
            resetBoard();
            gameStarted = false;
        })
        .on("turn", function(data,canTurn,currentTurn) {
            player.canTurn = canTurn;
            if(player.canTurn) {
                status.innerHTML = "Ваш ход";
            } else {
                status.innerHTML = "Ход оппонента";
            }
            cells[data.index].innerHTML = data.player.val.toUpperCase();
            if(end()) {
                socket.emit("end",data.player.val);
            }else if(currentTurn > 8 && !end()) {
                socket.emit("draw");
                if(player.canTurn) {
                    status.innerHTML = "Ничья. Ваш ход";
                } else {
                    status.innerHTML = "Ничья. Ход оппонента";
                }
                resetBoard();
            }
        })
        .on("end", function(winner) {
            if(player.val === winner) {
                status.innerHTML = "С победой! Ход оппонента.";
            } else {
                status.innerHTML = "Вы проиграли. Ваш ход";
            }
            resetBoard();
        })
        .on("new message", function(sender, text) {
            chatWindow.innerHTML += `<div style="padding:5px 10px;background-color: ${sender === player.nickname ? "#83b6a8" : "#93c5c1"};">${sender}: ${text}</div>`;
            chatWindow.scrollTop = chatWindow.scrollHeight;
        })
        .on("show rooms", function(rooms) {
            roomList.style.display = "block";
            if(roomBtnShown === false) {
                let inner = "<ul>";
                rooms.forEach(function(room,i) {
                    if(room.length > 0) {
                        inner += `<li id="room-number">Комната ${i}<ul>`;
                        room.forEach((nickname) => inner += `<li id="player">${nickname !== null ? nickname : "Пользователь не авторизовался"}</li>`);
                        inner += "</ul></li>";
                    }
                });
                inner += "</ul>";

                roomList.innerHTML = inner;
            }
        });

})();
