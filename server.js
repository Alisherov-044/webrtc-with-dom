const express = require("express");
const cors = require("cors");
const app = express();
app.use(express.static(__dirname));
app.use(
    cors({
        origin: ["http://localhost:5000", "http://192.168.1.11:5000"],
    })
);
const http = require("http").createServer(app);
const io = require("socket.io")(http);

io.on("connection", (socket) => {
    console.log("user connected: " + socket.handshake.auth.username);

    socket.on("disconnect", () => {
        console.log("user disconnected");
    });

    socket.on("join-room", (room) => {
        socket.join(room);
    });

    socket.on("call", (msg) => {
        io.to(msg.to).emit("new-call", msg);
    });

    socket.on("answer", (msg) => {
        io.to(msg.to).emit("new-answer", msg);
    });

    socket.on("icecandidate", (msg) => {
        io.to(msg.to).emit("new-icecandidate", msg);
    });

    socket.on("new-ice-candidate", ({ to, type, candidate }) => {
        socket.to(to).emit("new-ice-candidate", { to, type, candidate });
    });
});

http.listen(5000, () => {
    console.log("listening on http://localhost:5000");
});
