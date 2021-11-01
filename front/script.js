let Glogin = localStorage.getItem("login");
let Gtoken = localStorage.getItem("token");

initialize();

function initialize(){
    if(Glogin != undefined && Gtoken != undefined){
        loginUserToken();
    }
}

function ping(){
    socket.emit("ping");
}

function registerNewUser(){
    console.log("Регистрируем нового пользователя...")
    let login = document.getElementById("loginInput").value;
    let password = document.getElementById("passwordInput").value;
    socket.emit("registerNewUser", login, password);
}

function loginUser(){
    console.log("Авторизовываем пользователя...")
    let login = document.getElementById("loginInput1").value;
    Glogin = login;
    let password = document.getElementById("passwordInput1").value;
    socket.emit("loginUser", login, password);
}

function loginUserToken(){
    console.log("Авторизовываем пользователя с токеном...")
    let login = Glogin;
    let token = Gtoken;
    socket.emit("tokenCheck", login, token);
}

function showMessage(mess, st){
    document.getElementById("loginStatus").innerText = mess;
    if (st) {
        document.getElementById("loginStatus").style.backgroundColor = "#AA0000";
    } else {
        document.getElementById("loginStatus").style.backgroundColor = "#00AA00";
    }
    document.getElementById("loginStatus").style.color = "#fff";
    document.getElementById("loginStatus").style.padding = "6px 12px";
    document.getElementById("loginStatus").style.border="1px solid";
    document.getElementById("loginStatus").style.borderRadius = "5px";
    document.getElementById("loginStatus").style.margin = "0 0 0 5px";
}

function showMessage1(mess, st){
    document.getElementById("loginStatus").innerText = mess;
    if (st) {
        document.getElementById("loginStatus").style.backgroundColor = "#AA0000";
    } else {
        document.getElementById("loginStatus").style.backgroundColor = "#00AA00";
    }
    document.getElementById("loginStatus").style.color = "#fff";
    document.getElementById("loginStatus").style.padding = "6px 12px";
    document.getElementById("loginStatus").style.border="1px solid";
    document.getElementById("loginStatus").style.borderRadius = "5px";
    document.getElementById("loginStatus").style.margin = "0 0 0 5px";
}

socket.on("registerNewUserResponse", function(status, message){
    document.getElementById("loginStatus").innerText = message;
    document.getElementById("loginStatus").innerText = status;
    showMessage(message, status);
});
socket.on("loginUserResponse", function(status, message, token){
    document.getElementById("loginStatus").innerText = message;
    //document.getElementById("loginToken").innerText = token;
    showMessage1(message, status);
    localStorage.setItem("token", token);
    localStorage.setItem("login", Glogin);
    Gtoken = token;
    if(token != undefined){
        loginUserToken();
    }
});
socket.on("tokenCheckResponse", function(status, message){
    document.getElementById("loginStatus").innerText = message;
    showMessage1(message, status);
    console.log("status: " + status);
    if (status == 0){
        window.location.href = "chat.html";
    }
});


socket.on("pong", function(){
    document.getElementById("serverConnectTest").innerText = "Связь с сервером установлена!";
})