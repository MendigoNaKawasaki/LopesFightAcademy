const mongoose = require("mongoose");

const mongoUri = "mongodb://localhost:27017/lfa";

async function startDatabase() {
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB conectado");
  } catch (error) {
    console.error("Erro ao conectar no MongoDB:", error);
    process.exit(1);
  }
}

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB desconectado");
});

mongoose.connection.on("error", (error) => {
  console.log("Erro no MongoDB:", error);
});

module.exports = startDatabase;