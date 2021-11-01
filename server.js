process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const port = 80;
const mysql = require('mysql2');
const crypto = require('crypto');

var express = require('express');
var io = require('socket.io2');
var app = express()
    , server = require('http').createServer(app)
    , io = io.listen(server);
io.set('log level', 0);

const connection = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Hfd7Ufh1DiRE2*',
    database: 'chat',
    multipleStatements: true
});

server.listen(80);

io.sockets.on("connection", socket => {
    socket.on("ping", function () {
        socket.emit("pong");
    })

    socket.on("registerNewUser", async function (login, password) {
        console.log("Поступил запрос на регистрацию нового юзера");
        let status = await checkExistUser(login);
        if (status != 0) {
            status = await registerNewUser(login, password);
            if (status == 0) {
                console.log("Успешная рега")
                socket.emit("registerNewUserResponse", 0, "Успешная регистрация");
            } else {
                console.log("Ошибка")
                socket.emit("registerNewUserResponse", 1, "Че-то сломалось на сервере...");
            }
        } else {
            console.log("Юзер уже есть в базе")
            socket.emit("registerNewUserResponse", 1, "Пользователь с таким логином уже есть в базе");
        }
    });
    socket.on("loginUser", async function (login, password) {
        console.log("Проверяем запрос на вход");
        let status = await checkExistUser(login);
        if (status == 0) {
            let data = await loginUser(login, password);
            if (data.status == 0) {
                console.log("Успешный вход, добавляем токен в базу");
                data.token = await tokenGen();
                let st1 = await addToken(login, data.token);
                if (st1 == 0) {
                    socket.emit("loginUserResponse", 0, "Успешный вход", data.token);
                } else {
                    socket.emit("loginUserResponse", 1, "Ошибка входа, токен");
                }
            } else {
                console.log("Ошибка")
                socket.emit("loginUserResponse", 1, "Ошибка входа");
            }
        } else {
            console.log("Не нашли юзера в базе")
            socket.emit("loginwUserResponse", 1, "Пользователь с таким логином не зарегистрирован");
        }
    });
    socket.on("tokenCheck", async function (login, token) {
        console.log("Проверяем токен " + token + " " + login);
        if (token == null) {
            socket.emit("tokenCheckResponse", 1, "Ошибка токена");
        }
        let status = await checkToken(login, token);
        if (status == 0) {
            socket.emit("tokenCheckResponse", 0, "Валидный токен");
        } else {
            socket.emit("tokenCheckResponse", 1, "Ошибка токена");
        }
    });
    socket.on("foundUserToLogin", async function (login, token, loginFind) {
        console.log("Проверяем токен");
        let status = await checkToken(login, token);
        if (status == 0) {
            let statusFind = await checkExistUser(login);
            if (statusFind == 0) {
                socket.emit("foundUserToLoginResponse", 0, "Данный пользователь существует");
            } else {
                socket.emit("foundUserToLoginResponse", 1, "Данного пользователя не существует");
            }
        } else {
            console.log("Токен невалиден");
        }
    });
    socket.on("newMessage", async function (login, token, message, confId) {
        console.log("Проверяем токен");
        let status = await checkToken(login, token);
        if (status == 0) {
            console.log("Добавляем сообщение " + message + " пользователя " + login + " в конфу " + confId);
            let status1 = await newMessage(login, message, confId);
            if (status1 == 0) {
                console.log("Успешно добавлено")
                socket.emit("newMessageResponse", 0, "Сообщение доставлено");
                io.sockets.emit("reRender", confId);
            } else {
                console.log("Ошибка при добавлении сообщения в бд");
                socket.emit("newMessageResponse", 1, "Ошибка на сервере");
            }
        } else {
            console.log("Токен невалиден");
        }
    });
    socket.on("getMessagesOnConf", async function (login, token, confId) {
        console.log("Проверяем токен");
        let status = await checkToken(login, token);
        if (status == 0) {
            console.log("Получаем список сообщений в конференции " + confId);
            let messages = await getConfMessages(confId);
            if (messages != undefined) {
                console.log("Список получен")
                socket.emit("newMessageResponse", 0, "Сообщения получены", messages);
            } else {
                console.log("Ошибка при получении списка сообщений");
                socket.emit("newMessageResponse", 1, "Ошибка на сервере");
            }
        } else {
            console.log("Токен невалиден");
        }
    });
    socket.on("getConfsList", async function (login, token) {
        console.log("Проверяем токен");
        let status = await checkToken(login, token);
        if (status == 0) {
            console.log("Получаем список конференций пользователя " + login);
            let confs = await getConfsList(login);
            if (confs != undefined) {
                console.log("Список получен")
                socket.emit("getConfsListResponse", 0, "Конференции получены", confs);
            } else {
                console.log("Ошибка при получении списка конференций");
                socket.emit("getConfsListResponse", 1, "Ошибка на сервере");
            }
        } else {
            console.log("Токен невалиден");
        }
    });
    socket.on("getAllUsers", async function (login, token, pattern) {
        console.log("Проверяем токен");
        let status = await checkToken(login, token);
        if (status == 0) {
            console.log("Получаем список юзеров");
            let confs = await getAllUsers(pattern);
            if (confs != undefined) {
                console.log("Список получен")
                socket.emit("getAllUsersResponse", 0, "Пользователи получены", confs);
            } else {
                console.log("Ошибка при получении списка пользователей");
                socket.emit("getAllUsersResponse", 1, "Ошибка на сервере");
            }
        } else {
            console.log("Токен невалиден");
        }
    });
    socket.on("getConfInfo", async function (login, token, confId) {
        console.log("Проверяем токен");
        let status = await checkToken(login, token);
        if (status == 0) {
            console.log("Получаем информацию о конфе " + confId);
            let data = await getConfInfo(confId);
            if (data != undefined) {
                console.log("Информация получена")
                socket.emit("getConfInfoResponse", 0, "Информация получена", data, confId);
            } else {
                console.log("Ошибка при получении информации о конференции");
                socket.emit("getConfInfoResponse", 1, "Ошибка на сервере");
            }
        } else {
            console.log("Токен невалиден");
        }
    });
    socket.on("createConf", async function (login, token) {
        console.log("Проверяем токен");
        let status = await checkToken(login, token);
        if (status == 0) {
            console.log("Создаем новую конференцию с владельцем " + login);
            let confId = await createConf(login);
            if (confId != -1 || confId != null) {
                console.log("Конференция создана")
                socket.emit("createConfResponse", 0, "Конференция создана", confId);
            } else {
                console.log("Ошибка при создании конференции");
                socket.emit("createConfResponse", 1, "Ошибка на сервере");
            }
        } else {
            console.log("Токен невалиден");
        }
    });
    socket.on("addUserToConf", async function (login, token, confId, otherLogin) {
        console.log("Проверяем токен");
        let status = await checkToken(login, token);
        if (status == 0) {
            console.log("Добавляем пользователя " + otherLogin + " в конференцию " + confId);
            let result = await addUserToConf(confId, otherLogin);
            if (result != 1) {
                console.log("Пользователь добавлен")
                socket.emit("addUserToConfResponse", 0, "Пользователь добавлен", confId);
                io.sockets.emit("needUpdateConfs");
            } else {
                console.log("Ошибка при добавлении пользователя");
                socket.emit("addUserToConfResponse", 1, "Ошибка на сервере");
            }
        } else {
            console.log("Токен невалиден");
        }
    });
    socket.on("addUserToConf1", async function (login, token, confId, otherLogin) {
        console.log("Проверяем токен");
        let status = await checkToken(login, token);
        if (status == 0) {
            console.log("Добавляем пользователя " + otherLogin + " в конференцию " + confId);
            let result = await addUserToConf(confId, otherLogin);
            if (result != 1) {
                console.log("Пользователь добавлен")
                socket.emit("addUserToConfResponse1", 0, "Пользователь добавлен", confId);
                io.sockets.emit("needUpdateConfs");
            } else {
                console.log("Ошибка при добавлении пользователя");
                socket.emit("addUserToConfResponse1", 1, "Ошибка на сервере");
            }
        } else {
            console.log("Токен невалиден");
        }
    });
});



async function newMessage(login, message, confId) {
    const data = [message, login, confId, Date.now()];
    var result;
    var check = 0;
    console.log("message: " + message);
    connection.query("insert into messages (text, owner, confId, time) values (?, ?, ?, ?)", data,
        function (err, results) {
            if (err) {
                console.log(err);
                result = 1;
                check = 1;
            } else {
                result = 0;
                check = 1;
            }
        });
    while (check == 0) {
        await timeout(100);
    }
    return result;
}
async function createConf(login) {
    const data = [login];
    var result;
    var check = 0;
    connection.query("insert into confs (owner) values (?);\nselect MAX(id) from confs;", data,
        function (err, results) {
            if (err) {
                console.log(err);
                result = -1;
                check = 1;
            } else {
                result = results[1][0]["MAX(id)"];
                check = 1;
            }
        });
    while (check == 0) {
        await timeout(100);
    }
    return result;
}

async function addUserToConf(confId, otherLogin) {
    const data = [otherLogin, confId];
    var result;
    var check = 0;
    connection.query("select * from confsContains where user = ? and confId = ?;", data,
        function (err, results) {
            if (err) {
                console.log(err);
                result = 1;
                check = 1;
            } else {
                if(results.length == 0){
                    connection.query("insert into confsContains (user, confId) values (?, ?);", data,
                    function (err, results) {
                        if (err) {
                            console.log(err);
                            result = 1;
                            check = 1;
                        } else {
                            result = 0;
                            check = 1;
                        }
                    });
                }else{
                    console.log("Данный пользователь уже состоит в этой конференции");
                    result = 1;
                    check = 1;
                }
            }
        });
    while (check == 0) {
        await timeout(100);
    }
    return result;
}

async function getConfMessages(confId) {
    const data = [confId];
    var result;
    var check = 0;
    connection.query("select * from messages where confId = ?", data,
        function (err, results) {
            if (err) {
                console.log(err);
                result = undefined;
                check = 1;
            } else {
                result = results;
                check = 1;
            }
        });
    while (check == 0) {
        await timeout(100);
    }
    return result;
}
async function getConfsList(login) {
    const data = [login];
    var result;
    var check = 0;
    connection.query("select distinct confId from confsContains where user = ?", data,
        function (err, results) {
            if (err) {
                console.log(err);
                result = undefined;
                check = 1;
            } else {
                result = results;
                check = 1;
            }
        });
    while (check == 0) {
        await timeout(100);
    }
    return result;
}

async function getAllUsers(pattern) {
    var result;
    var check = 0;
    connection.query("select login from users",
        function (err, results) {
            if (err) {
                console.log(err);
                result = undefined;
                check = 1;
            } else {
                result = results;
                check = 1;
            }
        });
    while (check == 0) {
        await timeout(100);
    }
    if(pattern != undefined && pattern != "" && pattern != null){
        for(let i = 0; i < result.length; i++){
            if(result[i].login.match(pattern) == null){
                result.splice(i, 1);
                i--;
            }
        }
    }
    return result;
}

async function getConfInfo(confId) {
    const data = [confId];
    var result = {
        header: undefined,
        messages: undefined
    };
    var check = 0;
    connection.query("select * from confsContains where confId = ?", data,
        function (err, results) {
            if (err) {
                console.log(err);
                result = undefined;
                check = 1;
            } else {
                result.header = results;
                check = 1;
            }
        });
    while (check == 0) {
        await timeout(100);
    }
    check = 0;
    connection.query("select * from messages where confId = ?", data,
        function (err, results) {
            if (err) {
                console.log(err);
                result = undefined;
                check = 1;
            } else {
                result.messages = results;
                check = 1;
            }
        });
    while (check == 0) {
        await timeout(100);
    }
    return result;
}

async function checkToken(login, token) {
    if (token == null || token == "") return 1;
    const data = [login, token];
    var result;
    var check = 0;
    connection.query("select * from users where login = ? and token = ?", data,
        function (err, results) {
            if (err) {
                console.log(err);
                result = 1;
                check = 1;
            } else {
                if(results.length != 0){
                    result = 0;
                    check = 1;
                }else{
                    result = 1;
                    check = 1;
                }
                
            }
        });
    while (check == 0) {
        await timeout(100);
    }
    return result;
}

async function addToken(login, token) {
    console.log("Token: " + token);
    const data = [token, login];
    var result;
    var check = 0;
    connection.query("update users set token = ? where login = ?", data,
        function (err, results) {
            if (err) {
                console.log(err);
                result = 1;
                check = 1;
            } else {
                result = 0;
                check = 1;
            }
        });
    while (check == 0) {
        await timeout(100);
    }
    return result;
}

async function checkExistUser(login) {
    const data = [login];
    var result;
    var check = 0;
    connection.query("select * from users where login = ?", data,
        function (err, results) {
            if (err) {
                console.log(err);
                result = 1;
                check = 1;
            } else {
                if (results[0] == undefined) {
                    console.log(login);
                    result = 1;
                    check = 1;
                } else {
                    result = 0;
                    check = 1;
                }
            }
        });
    while (check == 0) {
        await timeout(100);
    }
    return result;
}

async function registerNewUser(login, password) {
    const data = [login, password];
    var result;
    var check = 0;
    connection.query("insert into users (login, password) values (?, ?)", data,
        function (err, results) {
            if (err) {
                console.log(err);
                result = 1;
                check = 1;
            } else {
                console.log("Юзер добавлен в базу");
                result = 0;
                check = 1;
            }
        });
    while (check == 0) {
        await timeout(100);
    }
    return result;
}

async function loginUser(login, password) {
    const data = [login, password];
    var result = {};
    var check = 0;
    connection.query("select * from users where login = ? and password = ?", data,
        function (err, results) {
            if (err) {
                console.log(err);
                result.status = 1;
                check = 1;
            } else {
                if (results[0] == undefined) {
                    result.status = 1;
                    check = 1;
                } else {
                    result.status = 0;
                    result.token = tokenGen();
                    check = 1;
                }
            }
        });
    while (check == 0) {
        await timeout(100);
    }
    return result;
}

async function tokenGen() {
    return await sha256(Date.now() + "h58f");
}

async function sha256(message) {
    return crypto
        .createHmac('sha256', "h58f")
        .update(message)
        .digest('hex');
}

async function timeout(delay) {
    return new Promise(function (resolve) {
        setTimeout(resolve, delay);
    });
}

app.get('/*', (req, res) => {
    res.sendFile(__dirname + "/front" + req.path);
})



