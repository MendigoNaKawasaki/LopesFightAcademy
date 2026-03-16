const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // Campos originais (mantidos)
  nome: {
    type: String,
    required: true,
    trim: true
  },
  idade: {
    type: Number,
    required: true,
    min: 5
  },
  graduacao: {
    type: String,
    required: true,
    enum: [
      "Branca",
      "Amarela", 
      "Laranja",
      "Verde",
      "Azul",
      "Marrom",
      "Preta"
    ]
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  pass: {
    type: String,
    required: true
  },
  dataRegisto: {
    type: Date,
    default: Date.now
  },

  // ============================================
  // SISTEMA DE ADMINISTRAÇÃO
  // ============================================
  
  // Admin automático: Faixa Preta ou Castanha = Admin
  isAdmin: {
    type: Boolean,
    default: false
  },
  
  // Super Admin: Admin principal com privilégios especiais
  isSuperAdmin: {
    type: Boolean,
    default: false
  },

  // ============================================
  // NOVOS CAMPOS - Carreira de Atleta
  // ============================================

  // Carreira MMA
  mma_vitorias: {
    type: Number,
    default: 0,
    min: 0
  },
  mma_derrotas: {
    type: Number,
    default: 0,
    min: 0
  },
  mma_empates: {
    type: Number,
    default: 0,
    min: 0
  },
  mma_especialidade: {
    type: String,
    trim: true,
    default: null
  },

  // Carreira BJJ
  bjj_vitorias: {
    type: Number,
    default: 0,
    min: 0
  },
  bjj_derrotas: {
    type: Number,
    default: 0,
    min: 0
  },
  bjj_especialidade: {
    type: String,
    trim: true,
    default: null
  },

  // Características Físicas
  altura: {
    type: Number, // Em metros (ex: 1.85)
    min: 0,
    max: 3,
    default: null
  },
  peso: {
    type: Number, // Em kg (ex: 91.5)
    min: 0,
    max: 300,
    default: null
  },
  alcance: {
    type: Number, // Em cm
    min: 0,
    max: 300,
    default: null
  },

  // Biografia
  sobre: {
    type: String,
    trim: true,
    default: null
  },

  // ============================================
  // FOTO DE PERFIL
  // ============================================
  
  foto_url: {
    type: String,
    default: null
  }
});

// Método para retornar utilizador sem a palavra-passe
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.pass;
  delete user.__v;
  return user;
};

module.exports = mongoose.model("User", userSchema, "User");