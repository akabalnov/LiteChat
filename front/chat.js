var socket = io.connect("http://80.78.253.72");

let Glogin = localStorage.getItem("login");
let Gtoken = localStorage.getItem("token");

let userMode = 0;

security_check();

function security_check() {
    console.log("Проверяем валидность токена");
    socket.emit("tokenCheck", Glogin, Gtoken);
}

function initialize() {
    document.getElementById("currentUserSpan").innerText = "Вы вошли как: " + Glogin;
    console.log("Обновляем список конференций");
    confListUpdate();
}

function confListUpdate() {
    socket.emit("getConfsList", Glogin, Gtoken);
}

socket.on("needUpdateConfs", function(){
    console.log("123123");
    socket.emit("getConfsList", Glogin, Gtoken);
})

function confCreate() {
    socket.emit("createConf", Glogin, Gtoken);
}

function addUserToConf1(user, confId) {
    socket.emit("addUserToConf1", Glogin, Gtoken, user, confId);
}

function logOut(){
    localStorage.removeItem("token");
    document.location.href = "/";
}

function confsRender(confs) {
    if (userMode == 1 && document.getElementById("confList") == null) return;
    document.getElementById("leftDiv").innerHTML = '<header>' +
        '<input type="text" placeholder="Поиск">' +
        ' </header>' +
        '<li onclick="confCreate()" style="margin-left: -20px">' +
        '<img src="/img/new_conf.png" alt="" style="width: 53px;">' +
        '<div>' +
        '<h2>Новая конференция</h2>' +
        '<h3>' +
        'Создать новую беседу' +
        '</h3>' +
        '</div>' +
        '</li>' +
        '<ul id="confList"></ul>';
    let parentNode = document.getElementById("confList");
    parentNode.innerHTML = "";
    for (let i = 0; i < confs.length; i++) {
        let elem = document.createElement("li");
        elem.innerHTML = '<img src="/img/dialog.png" style="width: 53px;"><div><h2>Conf ' + confs[i].confId + '</h2></div>'
        parentNode.innerHTML = parentNode.innerHTML + '<li onclick="mainAreaConfRender(' + confs[i].confId + ')">' + elem.innerHTML + "</li>";
    }
}

function mainAreaConfRender(confId) {
    getConfInfo(confId);
}

function mainAreaConfRender1(data1, confId) {
    let data = data1.header;
    let messages = data1.messages;
    localStorage.setItem("currentConf", confId);
    let usersCount = data.length;
    let usersStr = "";
    for (let i = 0; i < 3 && i < data.length; i++) {
        usersStr += data[i].user;
        if (!(i + 1 == 3 || i + 1 == data.length)) {
            usersStr += ", ";
        }
    }
    if (data.length > 3) {
        usersStr += " and " + (data.length - 3) + " others";
    }
    //рендерим шапку
    let content = '<header><img src="/img/dialog.png" style="width: 70px;"><div>' +
        '<h2>Conf ' + confId + '</h2><h3>' + usersCount + ' участник(ов)</h3><h3>' + usersStr + '</h3>' +
        '<br><button onclick="addUserToConf();">Добавить пользователя</button></input></div>' +
        '</header>' +
        '<main style="position: relative;"><ul id="chat"> </ul><footer>' +
        '<textarea id="messageArea" placeholder="Введите ваше сообщение"></textarea>' +
        '<a onclick="sendMessage()">Отправить</a>' +
        '</footer>' +
        '</main>'
    document.getElementById('mainArea').innerHTML = content;
    //Добавляем сообщения
    document.getElementById("chat").innerHTML = "";
    for (let i = 0; i < messages.length; i++) {
        let context = "";
        if (messages[i].owner == Glogin) {
            if (i - 1 > -1 && messages[i - 1].owner == messages[i].owner) {
                content = '<li class="me">' +
                    '<div class="message">' +
                    messages[i].text +
                    '</div>' +
                    '</li>'
            } else {
                content = '<li class="me">' +
                    '<div class="entete">' +
                    '<h3>' + getDateTime(messages[i].time) + '&nbsp</h3>' +
                    '<h2>' + messages[i].owner + '</h2>' +
                    '</div>' +
                    '<div class="triangle"></div>' +
                    '<div class="message">' +
                    messages[i].text +
                    '</div>' +
                    '</li>'

            }

        } else {
            if (i - 1 > -1 && messages[i - 1].owner == messages[i].owner) {
                content = '<li class="you">' +
                    '<div class="message">' +
                    messages[i].text +
                    '</div>' +
                    '</li>'
            } else {
                content = '<li class="you">' +
                    '<div class="entete">' +
                    '<h3>' + getDateTime(messages[i].time) + '&nbsp</h3>' +
                    '<h2>' + messages[i].owner + '</h2>' +
                    '</div>' +
                    '<div class="triangle"></div>' +
                    '<div class="message">' +
                    messages[i].text +
                    '</div>' +
                    '</li>'

            }
        }
        document.getElementById("chat").innerHTML += content;
    }
    document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight;

}


let sUser = "";
async function addUserToConf() {
    userMode = 1;
    sUser = "";
    document.getElementById("leftDiv").innerHTML = "";
    let content = '<header>' +
        '<input id="usersSearch" type="text" placeholder="Поиск" oninput="searchUser()">' +
        '</header>' +
        '<span style="color: white">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Выберите пользователя</span>' +
        '<ul id="usersList"></ul>'
    document.getElementById("leftDiv").innerHTML = content;
    let users = await getAllUser();
    renderUsers(users);
    while (sUser == "") {
        await timeout(100);
    }
    userMode = 0;
    console.log("Добавляем в " + localStorage.getItem("currentConf") + " пользователя " + sUser);
    socket.emit("addUserToConf", Glogin, Gtoken, localStorage.getItem("currentConf"), sUser);
    confListUpdate();
}

async function searchUser(){
    let pattern = document.getElementById("usersSearch").value;
    let users = await getAllUser(pattern);
    renderUsers(users);
}

async function renderUsers(users) {
    let parentNode = document.getElementById("usersList");
    parentNode.innerHTML = "";
    for (let i = 0; i < users.length; i++) {
        if (users[i].login == Glogin) continue;
        let elem = document.createElement("li");
        elem.innerHTML = '<img src="/img/user.png" style="width: 53px;"><div><h2>' + users[i].login + '</h2></div>'
        parentNode.innerHTML = parentNode.innerHTML + '<li onclick="selectUser(\'' + users[i].login + '\')">' + elem.innerHTML + "</li>";
    }
}

async function selectUser(login) {
    sUser = login;
}

async function getAllUser(pattern) {
    let data = undefined;
    socket.emit("getAllUsers", Glogin, Gtoken, pattern);
    socket.on("getAllUsersResponse", function (a, b, users) {
        data = users;
    })
    while (data == undefined) {
        await timeout(100);
    }
    return data;
}

async function timeout(delay) {
    return new Promise(function (resolve) {
        setTimeout(resolve, delay);
    });
}

function sendMessage() {
    let currentConf = localStorage.getItem("currentConf");
    let message = document.getElementById("messageArea").value;
    socket.emit("newMessage", Glogin, Gtoken, message, currentConf);
}

socket.on("newMessageResponse", function (status, text) {
    console.log(status + " " + text);
})

socket.on("reRender", function (conf) {
    if (conf == localStorage.getItem("currentConf")) {
        mainAreaConfRender(conf);
    }

})

function getConfInfo(confId) {
    socket.emit("getConfInfo", Glogin, Gtoken, confId);
}

socket.on("getConfInfoResponse", function (status, message, data, confId) {
    console.log(data);
    console.log("ConfId: " + confId);
    mainAreaConfRender1(data, confId);
})

socket.on("tokenCheckResponse", function (status, message) {
    if (status == 1) {
        window.location.href = "index.html";
    }
    if (status == 0) {
        initialize();
    }
});

socket.on("createConfResponse", function (status, mess, confId) {
    console.log("Server: " + status + " " + mess);
    if (status == 0) {
        console.log("confId: " + confId);
        addUserToConf1(confId, Glogin);

    }
});

socket.on("getConfsListResponse", function (status, mess, confs) {
    console.log("Server: " + status + " " + mess);
    console.log(confs);
    confsRender(confs);
});



socket.on("addUserToConfResponse", function (status, mess, confs) {
    console.log("Server: " + status + " " + mess);
    if (status == 0) {
        confListUpdate();
    }
});

function getDateTime(time) {
    var date = new Date(Number(time));
    var hour = date.getHours();
    console.log(date.getHours());
    hour = (hour < 10 ? "0" : "") + hour;

    var min = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = "" + date.getFullYear();


    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    return year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec;
}