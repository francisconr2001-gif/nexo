
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

// Histórico separado para cada canal.
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
    channels,
    history: "ativo"
  });
});

app.get("/api/channels", (req, res) => {
  res.json(channels);
});

io.on("connection", (socket) => {
  console.log("USUARIO CONECTADO:", socket.id);

  let currentChannel = null;

  socket.on("join channel", (channelId) => {
    console.log("ENTRADA NO CANAL:", channelId);

    const channel = channels.find(
      item => item.id === channelId
    );

    if (!channel) {
      socket.emit("channel error", {
        message: "Canal não encontrado."
      });
      return;
    }

    // Sai do canal anterior.
    if (currentChannel) {
      socket.leave(currentChannel);
    }

    // Entra no novo canal.
    currentChannel = channel.id;
    socket.join(currentChannel);

    console.log("CANAL ATIVO:", currentChannel);

    // Confirma a entrada.
    socket.emit("channel joined", {
      id: channel.id,
      name: channel.name
    });

    // Envia o histórico daquele canal.
    socket.emit("chat history", {
      channel: currentChannel,
      messages: [...messageHistory[currentChannel]]
    });

    console.log(
      "HISTORICO ENVIADO:",
      currentChannel,
      messageHistory[currentChannel].length,
      "mensagens"
    );
  });

  socket.on("chat message", (data) => {
    if (!currentChannel) {
      console.log("MENSAGEM BLOQUEADA: SEM CANAL");
      return;
    }

    if (!data || typeof data.message !== "string") {
      return;
    }

    const message = data.message.trim();

    if (!message || message.length > 2000) {
      return;
    }

    const username =
      typeof data.username === "string"
        ? data.username.trim().slice(0, 24)
        : "Membro";

    const payload = {
      messageId:
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 10),
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

    // Guarda a mensagem no histórico do canal.
    const history = messageHistory[currentChannel];

    history.push(payload);

    // Limita o histórico às últimas 100 mensagens.
    if (history.length > 100) {
      history.shift();
    }

    // Envia a mensagem para todos no canal.
    io.to(currentChannel).emit("chat message", payload);

    console.log(
      "MENSAGEM SALVA E ENVIADA:",
      currentChannel,
      message
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
