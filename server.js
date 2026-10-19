
const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const channels = [
  { id: "geral", name: "Comunidade NEXO" },
  { id: "jogos", name: "Squad Gaming" },
  { id: "tecnologia", name: "Laboratório Tech" },
  { id: "conversa", name: "Ponto de Encontro" }
];

const messageHistory = Object.fromEntries(
  channels.map(channel => [channel.id, []])
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (req, res) => {
  res.json({
    app: "NEXO",
    status: "online",
    chat: "ativo",
    channels
  });
});

app.get("/api/channels", (req, res) => {
  res.json(channels);
});

io.on("connection", socket => {
  console.log("USUARIO CONECTADO:", socket.id);

  let currentChannel = null;

  socket.on("join channel", channelId => {
    const channel = channels.find(item => item.id === channelId);

    if (!channel) {
      socket.emit("channel error", {
        message: "Canal não encontrado."
      });
      return;
    }

    if (currentChannel) {
      socket.leave(currentChannel);
    }

    currentChannel = channel.id;
    socket.join(currentChannel);

    console.log("CANAL CONFIRMADO:", currentChannel);

    socket.emit("channel joined", {
      id: channel.id,
      name: channel.name
    });

    socket.emit("chat history", {
      channel: currentChannel,
      messages: messageHistory[currentChannel]
    });
  });

  socket.on("chat message", data => {
    if (!currentChannel) return;
    if (!data || typeof data.message !== "string") return;

    const message = data.message.trim();

    if (!message || message.length > 2000) return;

    const username =
      typeof data.username === "string"
        ? data.username.trim().slice(0, 24)
        : "Membro";

    const payload = {
      id: socket.id,
      clientId:
        typeof data.clientId === "string"
          ? data.clientId.slice(0, 100)
          : "",
      username: username || "Membro",
      channel: currentChannel,
      message,
      time: new Date().toISOString()
    };

    messageHistory[currentChannel].push(payload);

    if (messageHistory[currentChannel].length > 100) {
      messageHistory[currentChannel].shift();
    }

    io.to(currentChannel).emit("chat message", payload);

    console.log("MENSAGEM ENVIADA:", currentChannel);
  });

  socket.on("disconnect", reason => {
    console.log("USUARIO DESCONECTADO:", socket.id, reason);
  });
});

server.on("error", error => {
  console.error("ERRO NO SERVIDOR:", error);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("NEXO ONLINE NA PORTA:", PORT);
});
