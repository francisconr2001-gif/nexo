
const express = require("express");
const path = require("path");

const app = express();
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

app.listen(PORT, "0.0.0.0", () => {
  console.log("================================");
  console.log("NEXO iniciado com sucesso!");
  console.log("Porta:", PORT);
  console.log("================================");
});

process.on("uncaughtException", (error) => {
  console.error("Erro inesperado:", error);
  process.exit(1);
});
