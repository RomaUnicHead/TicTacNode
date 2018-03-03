(() => {
    'use strict';

    const cells = document.querySelectorAll('td');
    const status = document.getElementById('status');
    const room = document.getElementById('room');
    const sendBtn = document.getElementById('message-send');
    const sendMsg = document.getElementById('message-text');
    const chat = document.getElementById('chat-window');
    const socket = io();

    let player = {};
    let started = false;

    document.addEventListener('keydown', (e) => {
        if(e.keyCode === 13) {
            sendMessage();
        }
    });

    socket
        .on('connected', roomNum => room.innerHTML = 'Комната: ' + roomNum)
        .on('wait', () => {
            status.innerHTML = 'Ждём второго игрока';
        })
        .on('start', pl => {
            chat.innerHTML = ''; 
            player = pl;
            started = true;
            if(player.canTurn) {
                status.innerHTML = 'Ваш ход';
            } else {
                status.innerHTML = 'Ход оппонента';
            }
        })
        .on('opp-disc', () => {
            status.innerHTML = 'Ваш оппонент вылетел. Ждём нового.';
            resetBoard();
            started = false;
        })
        .on('turn', (data,canTurn,currentTurn) => {
            player.canTurn = canTurn;
            if(player.canTurn) {
                status.innerHTML = 'Ваш ход';
            } else {
                status.innerHTML = 'Ход оппонента';
            }
            cells[data.index].innerHTML = data.player.val.toUpperCase();
            if(end()) {
                socket.emit('end',data.player.val);
            }else if(currentTurn > 8 && !end()) {
                socket.emit('draw');
                if(player.canTurn) {
                    status.innerHTML = 'Ничья. Ваш ход';
                } else {
                    status.innerHTML = 'Ничья. Ход оппонента';
                }
                resetBoard();
            }
        })
        .on('end', winner =>  {
            if(player.val === winner) {
                status.innerHTML = 'С победой! Ход оппонента.';                
            } else {
                status.innerHTML = 'Вы проиграли. Ваш ход';
            }
            resetBoard();
        })
        .on('new message', (sender, text) => {
            chat.innerHTML += `<div style="background-color: ${sender === player.val ? '#eee' : '#fff'};">${sender}: ${text}</div>`;           
            chat.scrollTop = chat.scrollHeight;
        });

    cells.forEach((cell, i) => {
        cell.onclick = () => {
            if(started) {
                if (cell.innerHTML === '') {
                    if (player.canTurn) {
                        let data = {
                            player: player,
                            index: i
                        };
                        socket.emit('turn', data);
                    }
                }
            }
        }
    });

    sendBtn.onclick = () => {
        sendMessage();
    };

    function sendMessage() {
        if(sendMsg.value !== '' && started) {
            socket.emit('new message', player.val, sendMsg.value);
            sendMsg.value = '';
        }
    }

    function resetBoard() {
        cells.forEach(cell => cell.innerHTML = '');
    }

    function end() {
        return (
            (cells[0].innerHTML === cells[1].innerHTML && cells[1].innerHTML === cells[2].innerHTML && cells[2].innerHTML !== '')||
            (cells[3].innerHTML === cells[4].innerHTML && cells[4].innerHTML === cells[5].innerHTML && cells[5].innerHTML !== '')||
            (cells[6].innerHTML === cells[7].innerHTML && cells[7].innerHTML === cells[8].innerHTML && cells[8].innerHTML !== '')||
            (cells[0].innerHTML === cells[3].innerHTML && cells[3].innerHTML === cells[6].innerHTML && cells[6].innerHTML !== '')||
            (cells[1].innerHTML === cells[4].innerHTML && cells[4].innerHTML === cells[7].innerHTML && cells[7].innerHTML !== '')||
            (cells[2].innerHTML === cells[5].innerHTML && cells[5].innerHTML === cells[8].innerHTML && cells[8].innerHTML !== '')||
            (cells[0].innerHTML === cells[4].innerHTML && cells[4].innerHTML === cells[8].innerHTML && cells[8].innerHTML !== '')||
            (cells[2].innerHTML === cells[4].innerHTML && cells[4].innerHTML === cells[6].innerHTML && cells[6].innerHTML !== '')
        );
    }

})();
