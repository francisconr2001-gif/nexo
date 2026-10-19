
const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const { Pool } = require("pg");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL não configurada no Render.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const channels = [
  { id: "geral", name: "Comunidade NEXO" },
  { id: "jogos", name: "Squad Gaming" },
  { id: "tecnologia", name: "Laboratório Tech" },
  { id: "conversa", name: "Ponto de Encontro" }
];

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      app: "NEXO",
      status: "online",
      database: "connected"
    });
  } catch (error) {
    console.error("Erro no banco:", error.message);
    res.status(503).json({
      app: "NEXO",
      status: "degraded",
      database: "disconnected"
    });
  }
});

app.get("/api/channels", (req, res) => {
  res.json(channels);
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      message_id TEXT PRIMARY KEY,
      channel TEXT NOT NULL,
      socket_id TEXT,
      client_id TEXT,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS messages_channel_created_idx
    ON messages (channel, created_at DESC)
  `);

  console.log("Tabela de mensagens pronta.");
}

async function getHistory(channel) {
  const result = await pool.query(
    `SELECT message_id, channel, socket_id, client_id,
            username, message, created_at
     FROM messages
     WHERE channel = $1
     ORDER BY created_at DESC, message_id DESC
     LIMIT 100`,
    [channel]
  );

  return result.rows.reverse().map(row => ({
    messageId: row.message_id,
    id: row.socket_id,
    clientId: row.client_id || "",
    username: row.username,
    channel: row.channel,
    message: row.message,
    time: row.created_at.toISOString()
  }));
}

io.on("connection", socket => {
  console.log("Usuário conectado:", socket.id);

  let currentChannel = null;

  socket.on("join channel", async channelId => {
    try {
      const channel = channels.find(
        item => item.id === channelId
      );

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

      socket.emit("channel joined", {
        id: channel.id,
        name: channel.name
      });

      const messages = await getHistory(channel.id);

      if (currentChannel !== channel.id) return;

      socket.emit("chat history", {
        channel: channel.id,
        messages
      });

      console.log(
        "Histórico carregado:",
        channel.id,
        messages.length
      );
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      socket.emit("chat error", {
        message: "Erro ao carregar mensagens."
      });
    }
  });

  socket.on("chat message", async data => {
    try {
      if (!currentChannel || !data) return;
      if (typeof data.message !== "string") return;

      const message = data.message.trim();

      if (!message || message.length > 2000) return;

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

      const result = await pool.query(
        `INSERT INTO messages
          (message_id, channel, socket_id, client_id,
           username, message, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING created_at`,
        [
          payload.messageId,
          payload.channel,
          payload.id,
          payload.clientId,
          payload.username,
          payload.message
        ]
      );

      payload.time = result.rows[0].created_at.toISOString();

      io.to(payload.channel).emit("chat message", payload);

      console.log("Mensagem gravada:", payload.channel);
    } catch (error) {
      console.error("Erro ao gravar mensagem:", error);
      socket.emit("chat error", {
        message: "Não foi possível salvar a mensagem."
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Usuário desconectado:", socket.id);
  });
});

async function startServer() {
  try {
    await initializeDatabase();

    server.listen(PORT, "0.0.0.0", () => {
      console.log("NEXO online na porta:", PORT);
    });
  } catch (error) {
    console.error("Falha ao iniciar servidor:", error);
    process.exit(1);
  }
}

startServer();
