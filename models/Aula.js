const mongoose = require("mongoose");

const aulaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  professor: {
    type: String,
    required: true,
    trim: true
  },
  diaSemana: {
    type: Number,
    required: true,
    min: 1,
    max: 7  // 1=Segunda, 2=Terça, ..., 7=Domingo
  },
  hora: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/  // Formato HH:MM
  },
  duracao: {
    type: Number,
    default: 60,  // duração em minutos
    min: 30,
    max: 180
  },
  limiteAlunos: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  alunosInscritos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  cor: {
    type: String,
    default: '#10b981'  // Verde LFA por defeito
  },
  ativa: {
    type: Boolean,
    default: true
  },
  criadaEm: {
    type: Date,
    default: Date.now
  }
});

// Índice único para prevenir aulas duplicadas no mesmo horário
aulaSchema.index({ diaSemana: 1, hora: 1 }, { unique: true });

// Virtual para vagas disponíveis
aulaSchema.virtual('vagasDisponiveis').get(function() {
  return this.limiteAlunos - this.alunosInscritos.length;
});

// Método para verificar se ainda há vagas
aulaSchema.methods.temVagas = function() {
  return this.alunosInscritos.length < this.limiteAlunos;
};

// Método para verificar se aluno está inscrito
aulaSchema.methods.alunoInscrito = function(alunoId) {
  return this.alunosInscritos.some(id => id.toString() === alunoId.toString());
};

module.exports = mongoose.model("Aula", aulaSchema);
