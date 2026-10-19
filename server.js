
const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (req, res) => {
  res.json({
    app: "NEXO",
    status: "online",
    message: "Servidor NEXO funcionando!"
  });
});

app.get("/health", (req, res) => {
  res.status(200).send("NEXO OK");
});

io.on("connection", (socket) => {
  console.log("Usuário conectado:", socket.id);

  socket.on("chat:message", (data) => {
    if (!data || typeof data.text !== "string") return;

    const text = data.text.trim().slice(0, 1000);
    const name = typeof data.name === "string"
      ? data.name.trim().slice(0, 30)
      : "Visitante";

    if (!text) return;

    io.emit("chat:message", {
      name: name || "Visitante",
      text,
      time: new Date().toISOString()
    });
  });

  socket.on("disconnect", () => {
    console.log("Usuário desconectado:", socket.id);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("NEXO iniciado na porta", PORT);
});
