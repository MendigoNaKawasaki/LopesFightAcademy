const mongoose = require("mongoose");

const pagamentoSchema = new mongoose.Schema({
  alunoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mes: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  ano: {
    type: Number,
    required: true
  },
  valorBase: {
    type: Number,
    required: true,
    default: 35  // €35 mensalidade
  },
  dataVencimento: {
    type: Date,
    required: true
  },
  dataPagamento: {
    type: Date,
    default: null
  },
  valorPago: {
    type: Number,
    default: 0
  },
  multa: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pendente', 'pago', 'atrasado'],
    default: 'pendente'
  },
  observacoes: {
    type: String,
    default: ''
  },
  criadoEm: {
    type: Date,
    default: Date.now
  }
});

// Índice único para evitar duplicação (1 mensalidade por aluno por mês/ano)
pagamentoSchema.index({ alunoId: 1, mes: 1, ano: 1 }, { unique: true });

// Virtual para calcular multa em tempo real
pagamentoSchema.virtual('multaAtual').get(function() {
  if (this.status === 'pago') {
    return this.multa; // Multa já paga (fixada)
  }
  
  const hoje = new Date();
  const vencimento = new Date(this.dataVencimento);
  
  if (hoje <= vencimento) {
    return 0; // Ainda não venceu
  }
  
  // Calcular semanas de atraso
  const diffTime = hoje - vencimento;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const semanasAtraso = Math.floor(diffDays / 7);
  
  // Multa: 10€ por semana
  const multaCalculada = semanasAtraso * 10;
  
  return multaCalculada;
});

// Virtual para valor total (base + multa)
pagamentoSchema.virtual('valorTotal').get(function() {
  if (this.status === 'pago') {
    return this.valorPago;
  }
  return this.valorBase + this.multaAtual;
});

// Virtual para dias de atraso
pagamentoSchema.virtual('diasAtraso').get(function() {
  if (this.status === 'pago') {
    return 0;
  }
  
  const hoje = new Date();
  const vencimento = new Date(this.dataVencimento);
  
  if (hoje <= vencimento) {
    return 0;
  }
  
  const diffTime = hoje - vencimento;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Método para registar pagamento
pagamentoSchema.methods.registarPagamento = function(valorPago, observacoes = '') {
  const multaAtual = this.multaAtual;
  
  this.dataPagamento = new Date();
  this.valorPago = valorPago;
  this.multa = multaAtual; // Fixar multa no momento do pagamento
  this.status = 'pago';
  this.observacoes = observacoes;
  
  return this.save();
};

// Método para atualizar status automaticamente
pagamentoSchema.methods.atualizarStatus = function() {
  if (this.status === 'pago') {
    return; // Já pago, não muda
  }
  
  const hoje = new Date();
  const vencimento = new Date(this.dataVencimento);
  
  if (hoje > vencimento) {
    this.status = 'atrasado';
  } else {
    this.status = 'pendente';
  }
};

// Middleware para atualizar status antes de salvar
pagamentoSchema.pre('save', async function() {
  if (this.status !== 'pago') {
    this.atualizarStatus();
  }
});

// Configurar virtuals para JSON
pagamentoSchema.set('toJSON', { virtuals: true });
pagamentoSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Pagamento", pagamentoSchema);
