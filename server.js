const http = require("http");
const path = require("path");
const express = require("express");
const socketIo = require("socket.io");

const formatMessage = require("./chat/messages");
const {
  userJoin,
  getCurrentUser,
  getRoomUsers,
  userLeave,
} = require("./chat/users");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
const botName = "ChatBot";

//setting static folder
app.use(express.static(path.join(__dirname, "web")));

//listen to a connection and run when client connects
io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    //welcome current user
    socket.emit("message", formatMessage(botName, "welcome to the chat"));

    //broadcast when user connect
    socket.broadcast
      .to(user.room)
      .emit("message", formatMessage(botName, `${user.username} joined`));

    //send user and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  //listen for messages
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  //broadcast when user disconnect
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );

      //send user and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

server.listen(PORT);
