
const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true
  }
});

const PORT = process.env.PORT || 3000;

// Permite receber JSON pela API
app.use(express.json({ limit: "20kb" }));

// Disponibiliza a interface do NEXO
app.use(express.static(path.join(__dirname, "public")));

// Rota para verificar o estado do servidor
app.get("/api/status", (req, res) => {
  res.json({
    app: "NEXO",
    status: "online",
    message: "Servidor NEXO funcionando!",
    chat: "ativo"
  });
});

// Chat em tempo real
io.on("connection", (socket) => {
  console.log("Usuário conectado:", socket.id);

  socket.on("chat message", (data) => {
    // Valida o formato recebido do navegador
    if (!data || typeof data.message !== "string") {
      return;
    }

    const message = data.message.trim();

    // Impede mensagens vazias ou muito grandes
    if (!message || message.length > 2000) {
      return;
    }

    // Identificador do cliente para exibir as próprias mensagens
    const clientId =
      typeof data.clientId === "string"
        ? data.clientId.slice(0, 100)
        : "";

    // Transmite a mensagem para todos os usuários conectados
    io.emit("chat message", {
      id: socket.id,
      clientId,
      message,
      time: new Date().toISOString()
    });

    console.log("Mensagem enviada pelo socket:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("Usuário desconectado:", socket.id, reason);
  });
});

// Tratamento de erros inesperados do servidor
server.on("error", (error) => {
  console.error("Erro no servidor:", error);
});

// Inicia o servidor na porta disponibilizada pelo Render
server.listen(PORT, "0.0.0.0", () => {
  console.log(`NEXO online na porta ${PORT}`);
});
