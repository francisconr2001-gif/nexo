
const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const PORT = process.env.PORT || 3000;

const channels = [
  { id: "geral", name: "Comunidade NEXO" },
  { id: "jogos", name: "Squad Gaming" },
  { id: "tecnologia", name: "Laboratório Tech" },
  { id: "conversa", name: "Ponto de Encontro" }
];

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

io.on("connection", (socket) => {
  console.log("USUARIO CONECTADO:", socket.id);

  let currentChannel = null;

  socket.on("join channel", (channelId) => {
    console.log("PEDIDO PARA ENTRAR NO CANAL:", channelId);

    const channel = channels.find(
      (item) => item.id === channelId
    );

    if (!channel) {
      console.log("ERRO: CANAL NAO EXISTE:", channelId);

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
  });

  socket.on("chat message", (data) => {
    console.log("EVENTO CHAT MESSAGE RECEBIDO");

    if (!currentChannel) {
      console.log("MENSAGEM BLOQUEADA: USUARIO SEM CANAL");
      return;
    }

    if (!data || typeof data.message !== "string") {
      console.log("MENSAGEM INVALIDA");
      return;
    }

    const message = data.message.trim();

    if (!message || message.length > 2000) {
      console.log("MENSAGEM VAZIA OU MUITO LONGA");
      return;
    }

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

    io.to(currentChannel).emit("chat message", payload);

    console.log(
      "MENSAGEM ENVIADA PARA O CANAL:",
      currentChannel
    );
  });

  socket.on("disconnect", (reason) => {
    console.log(
      "USUARIO DESCONECTADO:",
      socket.id,
      reason
    );
  });
});

server.on("error", (error) => {
  console.error("ERRO NO SERVIDOR:", error);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("NEXO ONLINE NA PORTA:", PORT);
});
