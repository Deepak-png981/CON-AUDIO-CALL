const express = require("express");
const handlebars = require("express-handlebars");
const http = require("http");
const io = require("socket.io");

class VoiceServer {
    constructor() {
        this.app = express();
        this.httpServer = http.Server(this.app);
        this.io = io(this.httpServer);
        this.socketsStatus = {};

        this.setupViewEngine();
        this.setupStaticFiles();
        this.setupRoutes();
        this.setupSocketEvents();
    }

    setupViewEngine() {
        const customHandlebars = handlebars.create({ layoutsDir: "./views" });
        this.app.engine("handlebars", customHandlebars.engine);
        this.app.set("view engine", "handlebars");
    }

    setupStaticFiles() {
        this.app.use("/files", express.static("public"));
    }

    setupRoutes() {
        this.app.get("/", (req, res) => {
            res.render("index");
        });
    }

    setupSocketEvents() {
        this.io.on("connection", (socket) => {
            const socketId = socket.id;
            this.socketsStatus[socketId] = {};

            console.log("connected with ID ", socketId);

            socket.on("voice", (data) => {
                let newData = data.split(";");
                newData[0] = "data:audio/ogg;";
                newData = newData[0] + newData[1];

                for (const id in this.socketsStatus) {
                    if (id != socketId && !this.socketsStatus[id].mute && this.socketsStatus[id].online) {
                        socket.broadcast.to(id).emit("send", newData);
                    }
                }
            });

            socket.on("userInformation", (data) => {
                this.socketsStatus[socketId] = data;
                this.io.sockets.emit("usersUpdate", this.socketsStatus);
            });

            socket.on("disconnect", () => {
                delete this.socketsStatus[socketId];
            });
        });
    }

    start(port = 3000) {
        this.httpServer.listen(port, () => {
            console.log(`the app is running on port ${port}!`);
        });
    }
}

module.exports = VoiceServer;