
const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (req, res) => {
  res.json({
    app: "NEXO",
    status: "online",
    message: "Servidor NEXO funcionando!"
  });
});

io.on("connection", (socket) => {
  console.log("Usuário conectado:", socket.id);

  socket.on("chat message", (data) => {
    if (typeof data !== "string") return;

    const message = data.trim();
    if (!message || message.length > 2000) return;

    io.emit("chat message", {
      id: socket.id,
      message,
      time: new Date().toISOString()
    });
  });

  socket.on("disconnect", () => {
    console.log("Usuário desconectado:", socket.id);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`NEXO online na porta ${PORT}`);
});
