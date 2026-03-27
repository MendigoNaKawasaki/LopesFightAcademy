require('dotenv').config();
const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const startDatabase = require("./db");
const User = require("./models/User");
const Aula = require("./models/Aula");
const Pagamento = require("./models/Pagamento");
const multer = require("multer");
const fs = require("fs");
const { enviarEmail, emailTemplates } = require("./emailConfig");

const app = express();

// CORS Headers
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware - AUMENTAR LIMITES PARA UPLOAD DE IMAGENS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname)); // Serve arquivos estáticos (CSS, imagens, etc)
app.use('/media/atletas', express.static(path.join(__dirname, 'media/atletas'))); // Serve fotos dos atletas

// Chave secreta para JWT (coloque no .env: JWT_SECRET=sua_chave_secreta_aqui)
const JWT_SECRET = process.env.JWT_SECRET || "sua_chave_secreta_temporaria";

// ============================================
// CONFIGURAÇÃO DE UPLOAD DE FOTOS (MULTER)
// ============================================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = './media/atletas';
    // Criar pasta se não existir
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: async function (req, file, cb) {
    try {
      console.log(' Multer filename callback iniciado');
      console.log(' User ID:', req.user?.id);
      console.log(' Original filename:', file.originalname);
      
      // Buscar utilizador para obter o nome
      const utilizador = await User.findById(req.user.id);
      
      if (!utilizador) {
        console.error(' Utilizador não encontrado no callback do multer!');
        return cb(new Error('Utilizador não encontrado'));
      }
      
      console.log(' Utilizador encontrado:', utilizador.nome);
      
      // Sanitizar nome (remover espaços, acentos, caracteres especiais, #, etc)
      const nomeSanitizado = utilizador.nome
        .normalize('NFD')                          // Decomposição de caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '')          // Remover acentos
        .replace(/\s+/g, '_')                      // Espaços → underscore
        .replace(/[^a-zA-Z0-9_]/g, '')            // Remover TODOS caracteres especiais (#, -, etc)
        .toLowerCase();                            // Minúsculas
      
      // Extensão do ficheiro - SEMPRE extrair do mimetype para evitar .png1, .jpg2, #1, etc
      // O crop/browser às vezes adiciona números ou # ao nome, causando extensões inválidas
      const mimeToExt = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp'
      };
      
      let ext = mimeToExt[file.mimetype];
      
      if (!ext) {
        // Se mimetype não reconhecido, tentar extrair do nome original
        // Mas limpar qualquer # ou número extra primeiro
        const originalName = file.originalname.split('#')[0]; // Remove #1, #2, etc
        const originalExt = path.extname(originalName).toLowerCase();
        if (originalExt.match(/^\.(jpg|jpeg|png|webp)$/i)) {
          ext = originalExt;
        } else {
          ext = '.jpg'; // Fallback
        }
      }
      
      console.log(` Mimetype: ${file.mimetype}`);
      console.log(` Extensão definida: ${ext}`);
      
      // Nome final: nome_utilizador.ext
      const nomeArquivo = nomeSanitizado + ext;
      
      console.log(` Nome sanitizado: ${nomeSanitizado}`);
      console.log(` Extensão: ${ext}`);
      console.log(` Nome final do ficheiro: ${nomeArquivo}`);
      
      cb(null, nomeArquivo);
      
    } catch (error) {
      console.error(' Erro no callback filename do multer:', error);
      console.error(' Stack:', error.stack);
      cb(error);
    }
  }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas imagens são permitidas (JPEG, PNG, WEBP)'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB máximo
});

// Middleware para capturar erros do multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error(' Erro do Multer:', error.message);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ erro: 'Ficheiro muito grande! Máximo: 5MB' });
    }
    return res.status(400).json({ erro: 'Erro no upload: ' + error.message });
  } else if (error) {
    console.error(' Erro geral:', error.message);
    return res.status(500).json({ erro: error.message });
  }
  next();
});

// Inicia banco antes do servidor
startDatabase();

// ========== ROTA PRINCIPAL ==========
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ========== ROTA DE REGISTO ==========
app.post("/api/registo", async (req, res) => {
  try {
    console.log(' Recebendo registo:', req.body);

    const { nome, idade, email, pass } = req.body;

    // Validações básicas
    if (!nome || !idade || !email || !pass) {
      console.log(' Campos faltando:', { nome: !!nome, idade: !!idade, email: !!email, pass: !!pass });
      return res.status(400).json({ erro: "Todos os campos são obrigatórios" });
    }

    if (pass.length < 6) {
      return res.status(400).json({ erro: "A palavra-passe deve ter pelo menos 6 caracteres" });
    }

    // Verifica se o email já existe
    const emailExiste = await User.findOne({ email: email.toLowerCase() });
    if (emailExiste) {
      return res.status(400).json({ erro: "Esta conta já existe!" });
    }

    // Hash da pass
    const saltRounds = 10;
    const passHash = await bcrypt.hash(pass, saltRounds);

    //  Gerar código de verificação de 6 dígitos
    const codigoVerificacao = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Código expira em 15 minutos
    const codigoExpiraEm = new Date();
    codigoExpiraEm.setMinutes(codigoExpiraEm.getMinutes() + 15);
    
    console.log(' Código gerado:', codigoVerificacao);
    console.log(' Expira em:', codigoExpiraEm);

    // Cria novo utilizador (NÃO VERIFICADO!)
    const novoUtilizador = new User({
      nome,
      idade,
      graduacao: "Branca",
      email: email.toLowerCase(),
      pass: passHash,
      isAdmin: false,
      isSuperAdmin: false,
      // Verificação de email
      emailVerificado: false,              // ← NÃO VERIFICADO!
      codigoVerificacao: codigoVerificacao, // ← Código de 6 dígitos
      codigoExpiraEm: codigoExpiraEm,      // ← Expira em 15 min
      // Campos de atleta
      mma_vitorias: 0,
      mma_derrotas: 0,
      mma_empates: 0,
      bjj_vitorias: 0,
      bjj_derrotas: 0
    });

    await novoUtilizador.save();
    console.log(' Utilizador criado (não verificado):', novoUtilizador.email);
    
    //  Enviar email com código de verificação
    console.log(' Enviando email com código de verificação...');
    const emailTemplate = emailTemplates.codigoVerificacao(novoUtilizador.nome, codigoVerificacao);
    const resultadoEmail = await enviarEmail(novoUtilizador.email, emailTemplate);
    
    if (resultadoEmail.sucesso) {
      console.log(' Email com código enviado com sucesso!');
    } else {
      console.warn('  Email não enviado:', resultadoEmail.erro);
      console.warn(' ATENÇÃO: Sem email configurado, o código é:', codigoVerificacao);
    }
    
    //  NÃO FAZER LOGIN AUTOMATICAMENTE!
    // Utilizador precisa verificar email primeiro

    res.status(201).json({ 
      mensagem: "Conta criada! Verifica o teu email para ativar a conta.",
      emailEnviado: resultadoEmail.sucesso,
      email: novoUtilizador.email,
      // Apenas expor codigo em desenvolvimento quando email falha
      ...((process.env.NODE_ENV !== 'production' && !resultadoEmail.sucesso) && { codigoDebug: codigoVerificacao })
    });

  } catch (error) {
    console.error(" Erro ao registar:", error);
    console.error(" Nome do erro:", error.name);
    console.error(" Mensagem:", error.message);
    console.error(" Stack:", error.stack);
    
    if (error.name === 'ValidationError') {
      console.error(" Erros de validação:", error.errors);
      const camposErro = Object.keys(error.errors).map(campo => ({
        campo,
        mensagem: error.errors[campo].message
      }));
      return res.status(400).json({ 
        erro: 'Dados inválidos', 
        detalhes: camposErro
      });
    }
    
    res.status(500).json({ erro: "Erro ao processar registo" });
  }
});

// ========== ROTA DE VERIFICAÇÃO DE EMAIL ==========
app.post("/api/verificar-email", async (req, res) => {
  try {
    const { email, codigo } = req.body;

    if (!email || !codigo) {
      return res.status(400).json({ erro: "Email e código são obrigatórios" });
    }

    // Buscar utilizador
    const utilizador = await User.findOne({ email: email.toLowerCase() });
    
    if (!utilizador) {
      return res.status(404).json({ erro: "Utilizador não encontrado" });
    }

    // Verificar se já está verificado
    if (utilizador.emailVerificado) {
      return res.status(400).json({ erro: "Email já foi verificado! Podes fazer login." });
    }

    // Verificar se código expirou
    if (new Date() > utilizador.codigoExpiraEm) {
      return res.status(400).json({ 
        erro: "Código expirado! Solicita um novo código.",
        codigoExpirado: true
      });
    }

    // Verificar código
    if (utilizador.codigoVerificacao !== codigo) {
      return res.status(400).json({ erro: "Código incorreto! Verifica e tenta novamente." });
    }

    //  Código correto! Verificar email
    utilizador.emailVerificado = true;
    utilizador.codigoVerificacao = null;  // Limpar código
    utilizador.codigoExpiraEm = null;     // Limpar expiração
    await utilizador.save();

    console.log(' Email verificado:', utilizador.email);

    // Gerar token JWT para login automático
    const token = jwt.sign(
      { id: utilizador._id, email: utilizador.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      mensagem: "Email verificado com sucesso! Bem-vindo à LFA!",
      token,
      utilizador: {
        id: utilizador._id,
        nome: utilizador.nome,
        email: utilizador.email,
        idade: utilizador.idade,
        arte_marcial: utilizador.graduacao,
        isAdmin: utilizador.isAdmin,
        isSuperAdmin: utilizador.isSuperAdmin
      }
    });

  } catch (error) {
    console.error(" Erro ao verificar email:", error);
    res.status(500).json({ erro: "Erro ao verificar email" });
  }
});

// ========== ROTA DE REENVIAR CÓDIGO ==========
app.post("/api/reenviar-codigo", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ erro: "Email é obrigatório" });
    }

    // Buscar utilizador
    const utilizador = await User.findOne({ email: email.toLowerCase() });
    
    if (!utilizador) {
      return res.status(404).json({ erro: "Utilizador não encontrado" });
    }

    // Verificar se já está verificado
    if (utilizador.emailVerificado) {
      return res.status(400).json({ erro: "Email já está verificado! Podes fazer login." });
    }

    // Gerar novo código
    const novoCodigoVerificacao = Math.floor(100000 + Math.random() * 900000).toString();
    const novoCodigoExpiraEm = new Date();
    novoCodigoExpiraEm.setMinutes(novoCodigoExpiraEm.getMinutes() + 15);

    utilizador.codigoVerificacao = novoCodigoVerificacao;
    utilizador.codigoExpiraEm = novoCodigoExpiraEm;
    await utilizador.save();

    console.log(' Novo código gerado para', utilizador.email, ':', novoCodigoVerificacao);

    // Enviar email
    const emailTemplate = emailTemplates.codigoVerificacao(utilizador.nome, novoCodigoVerificacao);
    const resultadoEmail = await enviarEmail(utilizador.email, emailTemplate);

    if (resultadoEmail.sucesso) {
      console.log(' Novo código enviado!');
      res.json({ 
        mensagem: "Novo código enviado! Verifica o teu email.",
        emailEnviado: true
      });
    } else {
      console.warn('  Email não enviado:', resultadoEmail.erro);
      res.json({ 
        mensagem: "Novo código gerado. Email não configurado.",
        emailEnviado: false,
        // Apenas expor codigo em desenvolvimento
        ...(process.env.NODE_ENV !== 'production' && { codigoDebug: novoCodigoVerificacao })
      });
    }

  } catch (error) {
    console.error(" Erro ao reenviar código:", error);
    res.status(500).json({ erro: "Erro ao reenviar código" });
  }
});

// ========== ROTA DE LOGIN ==========
app.post("/api/login", async (req, res) => {
  try {
    console.log(' Tentativa de login:', req.body.email);

    const { email, pass } = req.body;

    // Validações básicas
    if (!email || !pass) {
      return res.status(400).json({ erro: "O Email e a palavra-passe são obrigatórios!" });
    }

    // Busca utilizador pelo email
    const utilizador = await User.findOne({ email: email.toLowerCase() });
    if (!utilizador) {
      return res.status(401).json({ erro: "Email ou palavra-passe incorretos" });
    }

    // Verifica a pass
    const passValida = await bcrypt.compare(pass, utilizador.pass);
    if (!passValida) {
      return res.status(401).json({ erro: "Email ou palavra-passe incorretos" });
    }

    //  VERIFICAR SE EMAIL FOI VERIFICADO
    if (!utilizador.emailVerificado) {
      return res.status(403).json({ 
        erro: "Email não verificado! Verifica o teu email e insere o código de verificação.",
        emailNaoVerificado: true,
        email: utilizador.email
      });
    }

    console.log(' Login bem-sucedido:', utilizador.email);

    // Gera token JWT
    const token = jwt.sign(
      { id: utilizador._id, email: utilizador.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      mensagem: "Login realizado com sucesso!",
      token,
      utilizador: {
        id: utilizador._id,
        nome: utilizador.nome,
        email: utilizador.email,
        idade: utilizador.idade,
        arte_marcial: utilizador.graduacao,
        isAdmin: utilizador.isAdmin,
        isSuperAdmin: utilizador.isSuperAdmin,
        mma_vitorias: utilizador.mma_vitorias,
        mma_derrotas: utilizador.mma_derrotas,
        mma_empates: utilizador.mma_empates,
        mma_especialidade: utilizador.mma_especialidade,
        bjj_vitorias: utilizador.bjj_vitorias,
        bjj_derrotas: utilizador.bjj_derrotas,
        bjj_especialidade: utilizador.bjj_especialidade,
        altura: utilizador.altura,
        peso: utilizador.peso,
        alcance: utilizador.alcance,
        sobre: utilizador.sobre,
        criado_em: utilizador.dataRegisto
      }
    });

  } catch (error) {
    console.error(" Erro ao fazer login:", error);
    res.status(500).json({ erro: "Erro ao processar login" });
  }
});

// ========== MIDDLEWARE DE AUTENTICAÇÃO ==========
const autenticarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ erro: "Token não fornecido" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ erro: "Token inválido ou expirado" });
    }
    req.user = user;
    next();
  });
};

// ========== MIDDLEWARE DE VERIFICAÇÃO DE ADMIN ==========
const verificarAdmin = async (req, res, next) => {
  try {
    const utilizador = await User.findById(req.user.id);
    
    if (!utilizador) {
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }
    
    // SuperAdmin sempre tem acesso a rotas de admin
    if (!utilizador.isAdmin && !utilizador.isSuperAdmin) {
      return res.status(403).json({ erro: 'Acesso negado - Apenas administradores' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao verificar permissões' });
  }
};

// ========== MIDDLEWARE DE VERIFICAÇÃO DE SUPER ADMIN ==========
const verificarSuperAdmin = async (req, res, next) => {
  try {
    const utilizador = await User.findById(req.user.id);
    
    if (!utilizador) {
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }
    
    if (!utilizador.isSuperAdmin) {
      return res.status(403).json({ erro: 'Acesso negado - Apenas Super Administrador' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao verificar permissões de Super Admin' });
  }
};

// ========== ROTA PROTEGIDA - PERFIL DO UTILIZADOR (GET) ==========
app.get("/api/perfil", autenticarToken, async (req, res) => {
  try {
    const utilizador = await User.findById(req.user.id).select("-pass");
    if (!utilizador) {
      return res.status(404).json({ erro: "Utilizador não encontrado"});
    }

    // Retornar com campos formatados para o frontend
    const perfil = {
      id: utilizador._id,
      nome: utilizador.nome,
      email: utilizador.email,
      idade: utilizador.idade,
      arte_marcial: utilizador.graduacao,
      mma_vitorias: utilizador.mma_vitorias,
      mma_derrotas: utilizador.mma_derrotas,
      mma_empates: utilizador.mma_empates,
      mma_especialidade: utilizador.mma_especialidade,
      bjj_vitorias: utilizador.bjj_vitorias,
      bjj_derrotas: utilizador.bjj_derrotas,
      bjj_especialidade: utilizador.bjj_especialidade,
      altura: utilizador.altura,
      peso: utilizador.peso,
      alcance: utilizador.alcance,
      sobre: utilizador.sobre,
      criado_em: utilizador.dataRegisto
    };

    res.json(perfil);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao buscar perfil" });
  }
});

// ========== ROTA PROTEGIDA - ATUALIZAR PERFIL (PUT) ==========
app.put("/api/perfil", autenticarToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      nome,
      idade,
      arte_marcial,
      mma_vitorias,
      mma_derrotas,
      mma_empates,
      mma_especialidade,
      bjj_vitorias,
      bjj_derrotas,
      bjj_especialidade,
      altura,
      peso,
      alcance,
      sobre
    } = req.body;

    // Validações básicas
    if (!nome || !idade) {
      return res.status(400).json({ 
        erro: 'Nome e idade são obrigatórios' 
      });
    }

    // Buscar utilizador atual para verificar permissões
    const utilizadorAtual = await User.findById(userId);

    if (!utilizadorAtual) {
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }

    const isAdmin = utilizadorAtual.isAdmin || utilizadorAtual.isSuperAdmin;

    // Preparar dados para atualização (campos básicos — disponíveis para todos)
    const dadosAtualizacao = {
      nome,
      idade,
      altura: (altura !== undefined && altura !== '' && altura !== null) ? altura : null,
      peso: (peso !== undefined && peso !== '' && peso !== null) ? peso : null,
      alcance: (alcance !== undefined && alcance !== '' && alcance !== null) ? alcance : null,
      sobre: sobre || null
    };

    // Campos restritos a admin: faixa e recordes MMA/BJJ
    if (isAdmin) {
      dadosAtualizacao.graduacao = arte_marcial;
      dadosAtualizacao.mma_vitorias = mma_vitorias || 0;
      dadosAtualizacao.mma_derrotas = mma_derrotas || 0;
      dadosAtualizacao.mma_empates = mma_empates || 0;
      dadosAtualizacao.mma_especialidade = mma_especialidade || null;
      dadosAtualizacao.bjj_vitorias = bjj_vitorias || 0;
      dadosAtualizacao.bjj_derrotas = bjj_derrotas || 0;
      dadosAtualizacao.bjj_especialidade = bjj_especialidade || null;
      // Nunca alterar isAdmin/isSuperAdmin do proprio utilizador nesta rota
    }

    // Atualizar no MongoDB
    const utilizadorAtualizado = await User.findByIdAndUpdate(
      userId,
      dadosAtualizacao,
      { 
        new: true, // Retorna o documento atualizado
        runValidators: true // Executa validações do schema
      }
    ).select('-pass');

    if (!utilizadorAtualizado) {
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }

    console.log(' Perfil atualizado:', utilizadorAtualizado.email);

    // Formatar resposta
    const perfil = {
      id: utilizadorAtualizado._id,
      nome: utilizadorAtualizado.nome,
      email: utilizadorAtualizado.email,
      idade: utilizadorAtualizado.idade,
      arte_marcial: utilizadorAtualizado.graduacao,
      mma_vitorias: utilizadorAtualizado.mma_vitorias,
      mma_derrotas: utilizadorAtualizado.mma_derrotas,
      mma_empates: utilizadorAtualizado.mma_empates,
      mma_especialidade: utilizadorAtualizado.mma_especialidade,
      bjj_vitorias: utilizadorAtualizado.bjj_vitorias,
      bjj_derrotas: utilizadorAtualizado.bjj_derrotas,
      bjj_especialidade: utilizadorAtualizado.bjj_especialidade,
      altura: utilizadorAtualizado.altura,
      peso: utilizadorAtualizado.peso,
      alcance: utilizadorAtualizado.alcance,
      sobre: utilizadorAtualizado.sobre,
      criado_em: utilizadorAtualizado.dataRegisto
    };

    res.json({
      mensagem: 'Perfil atualizado com sucesso',
      utilizador: perfil
    });

  } catch (error) {
    console.error(' Erro ao atualizar perfil:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        erro: 'Dados inválidos', 
        detalhes: error.message 
      });
    }
    
    res.status(500).json({ erro: 'Erro ao atualizar perfil' });
  }
});

// ========== ROTA PROTEGIDA - UPLOAD DE FOTO (POST) ==========
app.post("/api/perfil/foto", autenticarToken, upload.single('foto'), async (req, res) => {
  try {
    console.log(' Requisição de upload recebida');
    console.log(' User ID:', req.user?.id);
    console.log(' File:', req.file ? 'Recebido' : 'NÃO recebido');
    
    if (!req.file) {
      console.log(' Nenhum ficheiro foi enviado!');
      return res.status(400).json({ erro: 'Nenhuma foto foi enviada' });
    }
    
    console.log(' Ficheiro recebido:', {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
    
    const userId = req.user.id;
    
    // Buscar utilizador atual
    const utilizador = await User.findById(userId);
    
    if (!utilizador) {
      console.log(' Utilizador não encontrado:', userId);
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }
    
    console.log(' Utilizador encontrado:', utilizador.nome);
    
    // Apagar foto antiga se existir (ignora se estiver em uso - será sobrescrita)
    if (utilizador.foto_url) {
      const oldPhotoPath = '.' + utilizador.foto_url;
      if (fs.existsSync(oldPhotoPath)) {
        try {
          fs.unlinkSync(oldPhotoPath);
          console.log(' Foto antiga apagada:', oldPhotoPath);
        } catch (unlinkError) {
          if (unlinkError.code === 'EBUSY') {
            console.log(' Foto antiga em uso, será sobrescrita:', oldPhotoPath);
          } else {
            console.warn(' Erro ao apagar foto antiga (continua):', unlinkError.message);
          }
          // Continua de qualquer forma - multer sobrescreve ou cria ficheiro novo
        }
      }
    }
    
    // URL da nova foto
    const fotoUrl = '/media/atletas/' + req.file.filename;
    console.log(' URL da foto:', fotoUrl);
    
    // Verificar se o ficheiro foi realmente criado
    const filePath = './media/atletas/' + req.file.filename;
    if (fs.existsSync(filePath)) {
      console.log(' Ficheiro criado no disco:', filePath);
      const stats = fs.statSync(filePath);
      console.log(' Tamanho no disco:', stats.size, 'bytes');
    } else {
      console.error(' ERRO: Ficheiro NÃO foi criado no disco!');
    }
    
    // Atualizar utilizador
    console.log(' Guardando foto_url no utilizador...');
    utilizador.foto_url = fotoUrl;
    
    try {
      await utilizador.save();
      console.log(' Utilizador atualizado na BD com sucesso!');
    } catch (saveError) {
      console.error(' Erro ao salvar utilizador na BD:', saveError);
      throw saveError;
    }
    
    console.log(' Foto atualizada com sucesso:', fotoUrl);
    
    res.json({
      mensagem: 'Foto atualizada com sucesso',
      foto_url: fotoUrl
    });
    
  } catch (error) {
    console.error(' Erro ao fazer upload de foto:', error);
    console.error(' Nome do erro:', error.name);
    console.error(' Mensagem:', error.message);
    console.error(' Stack:', error.stack);
    
    // Se o ficheiro foi criado mas houve erro depois, tentar apagar (ignora se em uso)
    if (req.file) {
      const filePath = './media/atletas/' + req.file.filename;
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(' Ficheiro apagado devido a erro:', filePath);
        } catch (cleanupError) {
          if (cleanupError.code === 'EBUSY') {
            console.log(' Não foi possível apagar ficheiro (em uso):', filePath);
          } else {
            console.warn(' Erro ao apagar ficheiro de cleanup:', cleanupError.message);
          }
        }
      }
    }
    
    res.status(500).json({ 
      erro: 'Erro ao fazer upload de foto', 
      detalhes: error.message,
      tipo: error.name
    });
  }
});

// ========== ROTA PROTEGIDA - REMOVER FOTO (DELETE) ==========
app.delete("/api/perfil/foto", autenticarToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const utilizador = await User.findById(userId);
    
    if (!utilizador) {
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }
    
    // Apagar ficheiro se existir (ignora se estiver em uso)
    if (utilizador.foto_url) {
      const photoPath = '.' + utilizador.foto_url;
      if (fs.existsSync(photoPath)) {
        try {
          fs.unlinkSync(photoPath);
          console.log(' Foto apagada:', photoPath);
        } catch (unlinkError) {
          if (unlinkError.code === 'EBUSY') {
            console.log(' Foto em uso, não foi possível apagar:', photoPath);
          } else {
            console.warn(' Erro ao apagar foto:', unlinkError.message);
          }
          // Continua de qualquer forma - remove da BD
        }
      }
    }
    
    // Remover URL da base de dados
    utilizador.foto_url = null;
    await utilizador.save();
    
    console.log(' Foto removida para:', utilizador.nome);
    
    res.json({ mensagem: 'Foto removida com sucesso' });
    
  } catch (error) {
    console.error(' Erro ao remover foto:', error);
    res.status(500).json({ erro: 'Erro ao remover foto' });
  }
});

// ========== ROTA PROTEGIDA - ALTERAR PALAVRA-PASSE (PUT) ==========
app.put("/api/alterar-pass", autenticarToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { passAtual, novaPass } = req.body;

    if (!passAtual || !novaPass) {
      return res.status(400).json({ erro: 'As palavras-passe são obrigatórias!' });
    }

    if (novaPass.length < 6) {
      return res.status(400).json({ 
        erro: 'A nova palavra-passe deve ter pelo menos 6 caracteres' 
      });
    }

    // Buscar utilizador
    const utilizador = await User.findById(userId);

    if (!utilizador) {
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }

    // Verificar a palavra-passe atual
    const passValida = await bcrypt.compare(passAtual, utilizador.pass);

    if (!passValida) {
      return res.status(401).json({ erro: 'A palavra-passe atual está incorreta' });
    }

    // Hash da nova palavra-passe
    const novaPassHash = await bcrypt.hash(novaPass, 10);

    // Atualizar palavra-passe
    utilizador.pass = novaPassHash;
    await utilizador.save();

    console.log(' Palavra-passe alterada:', utilizador.email);

    res.json({ mensagem: 'Palavra-passe alterada com sucesso!' });

  } catch (error) {
    console.error(' Erro ao alterar palavra-passe:', error);
    res.status(500).json({ erro: 'Erro ao alterar palavra-passe' });
  }
});

// ========== ROTA PARA LISTAR UTILIZADORES (PARA TESTES) ==========
app.get("/api/utilizadores", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const utilizadores = await User.find().select("-pass -codigoVerificacao -codigoExpiraEm");
    res.json(utilizadores);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao buscar utilizadores" });
  }
});

// ========== ROTA PÚBLICA - LISTAR ATLETAS ==========
app.get("/api/atletas", async (req, res) => {
  try {
    console.log(' Buscando todos os atletas...');
    
    // Buscar todos os utilizadores, excluindo a pass
    const atletas = await User.find()
      .select('-pass -__v')
      .sort({ nome: 1 }); // Ordenar por nome
    
    // Formatar resposta com campos corretos
    const atletasFormatados = atletas.map(atleta => ({
      _id: atleta._id,
      nome: atleta.nome,
      email: atleta.email,
      idade: atleta.idade,
      graduacao: atleta.graduacao,
      mma_vitorias: atleta.mma_vitorias || 0,
      mma_derrotas: atleta.mma_derrotas || 0,
      mma_empates: atleta.mma_empates || 0,
      mma_especialidade: atleta.mma_especialidade,
      bjj_vitorias: atleta.bjj_vitorias || 0,
      bjj_derrotas: atleta.bjj_derrotas || 0,
      bjj_especialidade: atleta.bjj_especialidade,
      altura: atleta.altura,
      peso: atleta.peso,
      alcance: atleta.alcance,
      sobre: atleta.sobre,
      dataRegisto: atleta.dataRegisto,
      foto_url: atleta.foto_url  // ← FOTO DE PERFIL
    }));
    
    console.log(` ${atletasFormatados.length} atletas encontrados`);
    res.json(atletasFormatados);
    
  } catch (error) {
    console.error(" Erro ao buscar atletas:", error);
    res.status(500).json({ erro: "Erro ao buscar atletas" });
  }
});

// ========== ROTA PÚBLICA - VER ATLETA ESPECÍFICO (GET) ==========
app.get("/api/atletas/:id", async (req, res) => {
  try {
    console.log(' Buscando atleta:', req.params.id);
    
    const atleta = await User.findById(req.params.id).select('-pass -__v');
    
    if (!atleta) {
      return res.status(404).json({ erro: 'Atleta não encontrado' });
    }
    
    // Formatar resposta
    const atletaFormatado = {
      _id: atleta._id,
      nome: atleta.nome,
      email: atleta.email,
      idade: atleta.idade,
      graduacao: atleta.graduacao,
      mma_vitorias: atleta.mma_vitorias || 0,
      mma_derrotas: atleta.mma_derrotas || 0,
      mma_empates: atleta.mma_empates || 0,
      mma_especialidade: atleta.mma_especialidade,
      bjj_vitorias: atleta.bjj_vitorias || 0,
      bjj_derrotas: atleta.bjj_derrotas || 0,
      bjj_especialidade: atleta.bjj_especialidade,
      altura: atleta.altura,
      peso: atleta.peso,
      alcance: atleta.alcance,
      sobre: atleta.sobre,
      dataRegisto: atleta.dataRegisto,
      foto_url: atleta.foto_url  // ← FOTO DE PERFIL
    };
    
    console.log(' Atleta encontrado:', atleta.nome);
    res.json(atletaFormatado);
    
  } catch (error) {
    console.error(" Erro ao buscar atleta:", error);
    res.status(500).json({ erro: "Erro ao buscar atleta" });
  }
});


// ========== ROTA PROTEGIDA - ELIMINAR CONTA (DELETE) ==========
app.delete("/api/perfil", autenticarToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const resultado = await User.findByIdAndDelete(userId);

    if (!resultado) {
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }

    console.log(' Conta eliminada:', resultado.email);

    res.json({ mensagem: 'Conta eliminada com sucesso' });

  } catch (error) {
    console.error(' Erro ao eliminar conta:', error);
    res.status(500).json({ erro: 'Erro ao eliminar conta' });
  }
});

// ========== ROTA ANTIGA PARA ELIMINAR (mantida para compatibilidade) ==========
app.delete("/api/utilizador/:id", autenticarToken, async (req, res) => {
  try {
    // Utilizador só pode eliminar a sua própria conta
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ erro: "Sem permissão para eliminar este utilizador" });
    }

    const utilizador = await User.findByIdAndDelete(req.params.id);
    if (!utilizador) {
      return res.status(404).json({ erro: "Utilizador não encontrado" });
    }

    res.json({ mensagem: "Conta eliminada com sucesso" });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao eliminar conta" });
  }
});

// ========== ROTAS ADMIN - PROTEGIDAS ==========

// Estatísticas gerais
app.get("/api/admin/stats", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const totalUtilizadores = await User.countDocuments();
    
    // Novos utilizadores nas últimas 24h
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const novosHoje = await User.countDocuments({ dataRegisto: { $gte: ontem } });
    
    // Novos nos últimos 7 dias
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    const novosSemana = await User.countDocuments({ dataRegisto: { $gte: seteDiasAtras } });
    
    // Por graduação
    const porGraduacao = await User.aggregate([
      { $group: { _id: "$graduacao", total: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    
    // Total de admins
    const totalAdmins = await User.countDocuments({ isAdmin: true });
    
    res.json({
      totalUtilizadores,
      novosHoje,
      novosSemana,
      totalAdmins,
      porGraduacao
    });
  } catch (error) {
    console.error(' Erro ao buscar estatísticas:', error);
    res.status(500).json({ erro: 'Erro ao buscar estatísticas' });
  }
});

// Listar todos os utilizadores (com paginação e pesquisa)
app.get("/api/admin/utilizadores", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const { pesquisa, pagina = 1, limite = 50 } = req.query;
    
    let filtro = {};
    
    if (pesquisa) {
      // Escapar caracteres especiais de regex para evitar ReDoS
      const pesquisaSegura = pesquisa.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filtro = {
        $or: [
          { nome: { $regex: pesquisaSegura, $options: 'i' } },
          { email: { $regex: pesquisaSegura, $options: 'i' } }
        ]
      };
    }
    
    const utilizadores = await User.find(filtro)
      .select('-pass')
      .sort({ dataRegisto: -1 })
      .limit(limite * 1)
      .skip((pagina - 1) * limite);
    
    const total = await User.countDocuments(filtro);
    
    res.json({
      utilizadores,
      paginaAtual: parseInt(pagina),
      totalPaginas: Math.ceil(total / limite),
      total
    });
  } catch (error) {
    console.error(' Erro ao listar utilizadores:', error);
    res.status(500).json({ erro: 'Erro ao listar utilizadores' });
  }
});

// Ver perfil de qualquer utilizador
app.get("/api/admin/utilizador/:id", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const utilizador = await User.findById(req.params.id).select('-pass');
    
    if (!utilizador) {
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }
    
    res.json(utilizador);
  } catch (error) {
    console.error(' Erro ao buscar utilizador:', error);
    res.status(500).json({ erro: 'Erro ao buscar utilizador' });
  }
});

// Editar qualquer utilizador
app.put("/api/admin/utilizador/:id", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const {
      nome,
      idade,
      graduacao,
      mma_vitorias,
      mma_derrotas,
      mma_empates,
      mma_especialidade,
      bjj_vitorias,
      bjj_derrotas,
      bjj_especialidade,
      altura,
      peso,
      alcance,
      sobre
    } = req.body;
    
    const dadosAtualizacao = {
      nome,
      idade,
      graduacao,
      mma_vitorias: mma_vitorias || 0,
      mma_derrotas: mma_derrotas || 0,
      mma_empates: mma_empates || 0,
      mma_especialidade: mma_especialidade || null,
      bjj_vitorias: bjj_vitorias || 0,
      bjj_derrotas: bjj_derrotas || 0,
      bjj_especialidade: bjj_especialidade || null,
      altura: (altura !== undefined && altura !== '' && altura !== null) ? altura : null,
      peso: (peso !== undefined && peso !== '' && peso !== null) ? peso : null,
      alcance: (alcance !== undefined && alcance !== '' && alcance !== null) ? alcance : null,
      sobre: sobre || null
    };
    
    // Buscar utilizador para verificar se é Super Admin
    const utilizadorAtual = await User.findById(req.params.id);
    
    if (!utilizadorAtual) {
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }
    
    // Atualizar isAdmin automaticamente pela faixa (exceto Super Admin e o proprio admin que edita)
    const eProprioUtilizador = req.params.id === req.user.id;
    if (!utilizadorAtual.isSuperAdmin && !eProprioUtilizador) {
      dadosAtualizacao.isAdmin = (graduacao === 'Preta' || graduacao === 'Marrom');
    }
    
    const utilizador = await User.findByIdAndUpdate(
      req.params.id,
      dadosAtualizacao,
      { new: true, runValidators: true }
    ).select('-pass');
    
    if (!utilizador) {
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }

    console.log(' Admin editou utilizador:', utilizador.email);
    res.json({ mensagem: 'Utilizador atualizado com sucesso', utilizador });
  } catch (error) {
    console.error(' Erro ao editar utilizador:', error);
    res.status(500).json({ erro: 'Erro ao editar utilizador' });
  }
});

// Eliminar qualquer utilizador
app.delete("/api/admin/utilizador/:id", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    // Impedir admin de se auto-eliminar
    if (req.params.id === req.user.id) {
      return res.status(400).json({ erro: 'Não pode eliminar a sua própria conta através do painel admin' });
    }
    
    const utilizador = await User.findByIdAndDelete(req.params.id);
    
    if (!utilizador) {
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }
    
    console.log(' Admin eliminou utilizador:', utilizador.email);
    res.json({ mensagem: 'Utilizador eliminado com sucesso' });
  } catch (error) {
    console.error(' Erro ao eliminar utilizador:', error);
    res.status(500).json({ erro: 'Erro ao eliminar utilizador' });
  }
});

// Tornar utilizador admin (ou remover admin)
app.put("/api/admin/tornar-admin/:id", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const { isAdmin } = req.body;
    
    // Impedir de remover o próprio status de admin
    if (req.params.id === req.user.id && isAdmin === false) {
      return res.status(400).json({ erro: 'Não pode remover o seu próprio status de administrador' });
    }
    
    const utilizador = await User.findByIdAndUpdate(
      req.params.id,
      { isAdmin },
      { new: true }
    ).select('-pass');
    
    if (!utilizador) {
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }
    
    console.log(` Admin ${isAdmin ? 'promoveu' : 'removeu'} admin:`, utilizador.email);
    res.json({ 
      mensagem: isAdmin ? 'Utilizador promovido a administrador' : 'Status de administrador removido',
      utilizador 
    });
  } catch (error) {
    console.error(' Erro ao alterar status admin:', error);
    res.status(500).json({ erro: 'Erro ao alterar status' });
  }
});

// ============================================
// ROTAS DE SUPER ADMINISTRADOR
// ============================================

// ========== LISTAR TODOS OS ADMINS (SUPER ADMIN) ==========
app.get("/api/superadmin/admins", autenticarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const admins = await User.find({ isAdmin: true }).select("-pass").sort({ isSuperAdmin: -1, dataRegisto: -1 });
    
    const adminsFormatados = admins.map(a => ({
      id: a._id,
      nome: a.nome,
      email: a.email,
      graduacao: a.graduacao,
      isSuperAdmin: a.isSuperAdmin,
      criado_em: a.dataRegisto
    }));
    
    res.json(adminsFormatados);
  } catch (error) {
    console.error(' Erro ao listar admins:', error);
    res.status(500).json({ erro: "Erro ao listar administradores" });
  }
});

// ========== PROMOVER/REMOVER SUPER ADMIN (SUPER ADMIN) ==========
app.put("/api/superadmin/tornar-superadmin/:id", autenticarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { isSuperAdmin } = req.body;
    
    if (typeof isSuperAdmin !== 'boolean') {
      return res.status(400).json({ erro: "Valor de isSuperAdmin inválido" });
    }
    
    // Não pode remover o próprio super admin
    if (req.user.id === req.params.id && !isSuperAdmin) {
      return res.status(400).json({ erro: 'Não pode remover o seu próprio status de Super Admin' });
    }
    
    const utilizador = await User.findByIdAndUpdate(
      req.params.id,
      { 
        isSuperAdmin,
        isAdmin: true // Super admin sempre é admin
      },
      { new: true }
    ).select('-pass');
    
    if (!utilizador) {
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }
    
    console.log(` Super Admin ${isSuperAdmin ? 'promoveu' : 'removeu'} super admin:`, utilizador.email);
    res.json({ 
      mensagem: isSuperAdmin ? 'Utilizador promovido a Super Administrador' : 'Privilégios de Super Admin removidos',
      utilizador 
    });
  } catch (error) {
    console.error(' Erro ao alterar Super Admin:', error);
    res.status(500).json({ erro: 'Erro ao alterar permissões' });
  }
});

// ========== ESTATÍSTICAS AVANÇADAS (SUPER ADMIN) ==========
app.get("/api/superadmin/stats-avancadas", autenticarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const totalUtilizadores = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ isAdmin: true });
    const totalSuperAdmins = await User.countDocuments({ isSuperAdmin: true });
    const totalNormais = totalUtilizadores - totalAdmins;
    
    // Últimos 7 dias
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    const novosUltimos7Dias = await User.countDocuments({
      dataRegisto: { $gte: seteDiasAtras }
    });
    
    // Por graduação
    const porGraduacao = await User.aggregate([
      {
        $group: {
          _id: "$graduacao",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Admins automáticos (Preta e Marrom)
    const adminsAutomaticos = await User.countDocuments({
      graduacao: { $in: ['Preta', 'Marrom'] }
    });
    
    res.json({
      totalUtilizadores,
      totalAdmins,
      totalSuperAdmins,
      totalNormais,
      novosUltimos7Dias,
      adminsAutomaticos,
      porGraduacao
    });
  } catch (error) {
    console.error(' Erro ao buscar estatísticas avançadas:', error);
    res.status(500).json({ erro: "Erro ao buscar estatísticas" });
  }
});

// ========== LOGS DO SISTEMA (SUPER ADMIN) ==========
app.get("/api/superadmin/logs", autenticarToken, verificarSuperAdmin, async (req, res) => {
  try {
    // Buscar últimas ações (últimos 50 utilizadores criados/atualizados)
    const actividadesRecentes = await User.find()
      .select('nome email graduacao isAdmin isSuperAdmin dataRegisto')
      .sort({ dataRegisto: -1 })
      .limit(50);
    
    const logs = actividadesRecentes.map(u => ({
      tipo: 'Registo',
      utilizador: u.nome,
      email: u.email,
      graduacao: u.graduacao,
      isAdmin: u.isAdmin,
      data: u.dataRegisto
    }));
    
    res.json({ logs });
  } catch (error) {
    console.error(' Erro ao buscar logs:', error);
    res.status(500).json({ erro: "Erro ao buscar logs" });
  }
});

// ============================================
// ROTAS DE AULAS - Sistema de Calendário
// ============================================

// ========== ROTAS PARA ALUNOS ==========

// GET /api/aulas - Listar todas as aulas (para calendário dos alunos)
app.get("/api/aulas", async (req, res) => {
  try {
    const aulas = await Aula.find({ ativa: true })
      .select('nome professor diaSemana hora duracao limiteAlunos alunosInscritos cor')
      .sort({ diaSemana: 1, hora: 1 });
    
    // Adicionar info de vagas disponíveis
    const aulasComVagas = aulas.map(aula => ({
      _id: aula._id,
      nome: aula.nome,
      professor: aula.professor,
      diaSemana: aula.diaSemana,
      hora: aula.hora,
      duracao: aula.duracao,
      limiteAlunos: aula.limiteAlunos,
      alunosInscritos: aula.alunosInscritos.length,
      vagasDisponiveis: aula.limiteAlunos - aula.alunosInscritos.length,
      cor: aula.cor
    }));
    
    res.json(aulasComVagas);
  } catch (error) {
    console.error('Erro ao buscar aulas:', error);
    res.status(500).json({ erro: 'Erro ao buscar aulas' });
  }
});

// GET /api/minhas-inscricoes - Ver aulas em que o aluno está inscrito
app.get("/api/minhas-inscricoes", autenticarToken, async (req, res) => {
  try {
    const aulas = await Aula.find({ 
      alunosInscritos: req.user.id,
      ativa: true 
    })
    .select('nome professor diaSemana hora duracao cor')
    .sort({ diaSemana: 1, hora: 1 });
    
    res.json(aulas);
  } catch (error) {
    console.error('Erro ao buscar inscrições:', error);
    res.status(500).json({ erro: 'Erro ao buscar inscrições' });
  }
});

// POST /api/aulas/:id/inscrever - Aluno se inscreve em aula
app.post("/api/aulas/:id/inscrever", autenticarToken, async (req, res) => {
  try {
    const aula = await Aula.findById(req.params.id);
    
    if (!aula) {
      return res.status(404).json({ erro: 'Aula não encontrada' });
    }
    
    if (!aula.ativa) {
      return res.status(400).json({ erro: 'Esta aula não está ativa' });
    }
    
    // Verificar se já está inscrito
    if (aula.alunoInscrito(req.user.id)) {
      return res.status(400).json({ erro: 'Você já está inscrito nesta aula' });
    }
    
    // Verificar se ainda há vagas
    if (!aula.temVagas()) {
      return res.status(400).json({ erro: 'Esta aula já está lotada' });
    }
    
    // Inscrever aluno
    aula.alunosInscritos.push(req.user.id);
    await aula.save();
    
    res.json({ 
      mensagem: 'Inscrição realizada com sucesso',
      vagasRestantes: aula.limiteAlunos - aula.alunosInscritos.length
    });
    
  } catch (error) {
    console.error('Erro ao inscrever em aula:', error);
    res.status(500).json({ erro: 'Erro ao inscrever em aula' });
  }
});

// DELETE /api/aulas/:id/desinscrever - Aluno se desinscreve de aula
app.delete("/api/aulas/:id/desinscrever", autenticarToken, async (req, res) => {
  try {
    const aula = await Aula.findById(req.params.id);
    
    if (!aula) {
      return res.status(404).json({ erro: 'Aula não encontrada' });
    }
    
    // Verificar se está inscrito
    if (!aula.alunoInscrito(req.user.id)) {
      return res.status(400).json({ erro: 'Você não está inscrito nesta aula' });
    }
    
    // Remover inscrição
    aula.alunosInscritos = aula.alunosInscritos.filter(
      id => id.toString() !== req.user.id.toString()
    );
    await aula.save();
    
    res.json({ mensagem: 'Inscrição cancelada com sucesso' });
    
  } catch (error) {
    console.error('Erro ao desinscrever de aula:', error);
    res.status(500).json({ erro: 'Erro ao desinscrever de aula' });
  }
});

// ========== ROTAS PARA ADMINS ==========

// GET /api/admin/aulas - Listar todas as aulas (com detalhes completos)
app.get("/api/admin/aulas", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const aulas = await Aula.find()
      .populate('alunosInscritos', 'nome email graduacao')
      .sort({ diaSemana: 1, hora: 1 });
    
    const aulasComDetalhes = aulas.map(aula => ({
      _id: aula._id,
      nome: aula.nome,
      professor: aula.professor,
      diaSemana: aula.diaSemana,
      hora: aula.hora,
      duracao: aula.duracao,
      limiteAlunos: aula.limiteAlunos,
      vagasOcupadas: aula.alunosInscritos.length,
      vagasDisponiveis: aula.limiteAlunos - aula.alunosInscritos.length,
      cor: aula.cor,
      ativa: aula.ativa,
      alunosInscritos: aula.alunosInscritos,
      criadaEm: aula.criadaEm
    }));
    
    res.json(aulasComDetalhes);
  } catch (error) {
    console.error('Erro ao buscar aulas (admin):', error);
    res.status(500).json({ erro: 'Erro ao buscar aulas' });
  }
});

// POST /api/admin/aulas - Criar nova aula
app.post("/api/admin/aulas", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const { nome, professor, diaSemana, hora, duracao, limiteAlunos, cor } = req.body;
    
    // Validação
    if (!nome || !professor || !diaSemana || !hora || !limiteAlunos) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    }
    
    // Verificar se já existe aula neste horário
    const existente = await Aula.findOne({ diaSemana, hora });
    if (existente) {
      return res.status(400).json({ 
        erro: 'Já existe uma aula neste dia e horário' 
      });
    }
    
    // Criar aula
    const novaAula = new Aula({
      nome,
      professor,
      diaSemana: parseInt(diaSemana),
      hora,
      duracao: duracao || 60,
      limiteAlunos: parseInt(limiteAlunos),
      cor: cor || '#10b981',
      alunosInscritos: []
    });
    
    await novaAula.save();
    
    res.status(201).json({ 
      mensagem: 'Aula criada com sucesso',
      aula: novaAula
    });
    
  } catch (error) {
    console.error('Erro ao criar aula:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        erro: 'Já existe uma aula neste dia e horário' 
      });
    }
    
    res.status(500).json({ erro: 'Erro ao criar aula' });
  }
});

// PUT /api/admin/aulas/:id - Editar aula
app.put("/api/admin/aulas/:id", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const { nome, professor, diaSemana, hora, duracao, limiteAlunos, cor, ativa } = req.body;
    
    const aula = await Aula.findById(req.params.id);
    if (!aula) {
      return res.status(404).json({ erro: 'Aula não encontrada' });
    }
    
    // Verificar conflito de horário (se mudou dia/hora)
    if (diaSemana !== aula.diaSemana || hora !== aula.hora) {
      const conflito = await Aula.findOne({
        _id: { $ne: req.params.id },
        diaSemana,
        hora
      });
      
      if (conflito) {
        return res.status(400).json({ 
          erro: 'Já existe uma aula neste dia e horário' 
        });
      }
    }
    
    // Atualizar campos
    if (nome) aula.nome = nome;
    if (professor) aula.professor = professor;
    if (diaSemana) aula.diaSemana = parseInt(diaSemana);
    if (hora) aula.hora = hora;
    if (duracao) aula.duracao = parseInt(duracao);
    if (limiteAlunos) aula.limiteAlunos = parseInt(limiteAlunos);
    if (cor) aula.cor = cor;
    if (typeof ativa !== 'undefined') aula.ativa = ativa;
    
    await aula.save();
    
    res.json({ 
      mensagem: 'Aula atualizada com sucesso',
      aula
    });
    
  } catch (error) {
    console.error('Erro ao editar aula:', error);
    res.status(500).json({ erro: 'Erro ao editar aula' });
  }
});

// DELETE /api/admin/aulas/:id - Eliminar aula
app.delete("/api/admin/aulas/:id", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const aula = await Aula.findById(req.params.id);
    
    if (!aula) {
      return res.status(404).json({ erro: 'Aula não encontrada' });
    }
    
    // Verificar se há alunos inscritos
    if (aula.alunosInscritos.length > 0) {
      return res.status(400).json({ 
        erro: `Não é possível eliminar. Há ${aula.alunosInscritos.length} aluno(s) inscrito(s)`,
        sugestao: 'Desative a aula em vez de eliminar'
      });
    }
    
    await Aula.findByIdAndDelete(req.params.id);
    
    res.json({ mensagem: 'Aula deletada com sucesso' });
    
  } catch (error) {
    console.error('Erro ao eliminar aula:', error);
    res.status(500).json({ erro: 'Erro ao eliminar aula' });
  }
});

// GET /api/admin/aulas/:id/alunos - Ver lista detalhada de alunos inscritos
app.get("/api/admin/aulas/:id/alunos", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const aula = await Aula.findById(req.params.id)
      .populate('alunosInscritos', 'nome email telefone graduacao foto_url dataRegisto');
    
    if (!aula) {
      return res.status(404).json({ erro: 'Aula não encontrada' });
    }
    
    res.json({
      aula: {
        nome: aula.nome,
        professor: aula.professor,
        diaSemana: aula.diaSemana,
        hora: aula.hora,
        limiteAlunos: aula.limiteAlunos,
        vagasOcupadas: aula.alunosInscritos.length,
        vagasDisponiveis: aula.limiteAlunos - aula.alunosInscritos.length
      },
      alunos: aula.alunosInscritos
    });
    
  } catch (error) {
    console.error('Erro ao buscar alunos da aula:', error);
    res.status(500).json({ erro: 'Erro ao buscar alunos' });
  }
});

// ============================================
// ROTAS DE PAGAMENTOS - Sistema de Mensalidades
// ============================================

// ========== ROTAS PARA ALUNOS ==========

// GET /api/meus-pagamentos - Ver meus pagamentos (aluno logado)
app.get("/api/meus-pagamentos", autenticarToken, async (req, res) => {
  try {
    const pagamentos = await Pagamento.find({ alunoId: req.user.id })
      .sort({ ano: -1, mes: -1 });
    
    // Calcular valores atualizados
    const pagamentosAtualizados = pagamentos.map(p => ({
      _id: p._id,
      mes: p.mes,
      ano: p.ano,
      valorBase: p.valorBase,
      dataVencimento: p.dataVencimento,
      dataPagamento: p.dataPagamento,
      valorPago: p.valorPago,
      multa: p.status === 'pago' ? p.multa : p.multaAtual,
      valorTotal: p.valorTotal,
      diasAtraso: p.diasAtraso,
      status: p.status,
      observacoes: p.observacoes
    }));
    
    res.json(pagamentosAtualizados);
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    res.status(500).json({ erro: 'Erro ao buscar pagamentos' });
  }
});

// GET /api/meus-pagamentos/pendentes - Ver apenas pendentes
app.get("/api/meus-pagamentos/pendentes", autenticarToken, async (req, res) => {
  try {
    const pagamentos = await Pagamento.find({ 
      alunoId: req.user.id,
      status: { $ne: 'pago' }
    })
    .sort({ ano: 1, mes: 1 });
    
    const pagamentosAtualizados = pagamentos.map(p => ({
      _id: p._id,
      mes: p.mes,
      ano: p.ano,
      valorBase: p.valorBase,
      dataVencimento: p.dataVencimento,
      multa: p.multaAtual,
      valorTotal: p.valorTotal,
      diasAtraso: p.diasAtraso,
      status: p.status
    }));
    
    res.json(pagamentosAtualizados);
  } catch (error) {
    console.error('Erro ao buscar pagamentos pendentes:', error);
    res.status(500).json({ erro: 'Erro ao buscar pagamentos' });
  }
});

// ========== ROTAS PARA ADMINS ==========

// GET /api/admin/pagamentos - Listar todos os pagamentos
app.get("/api/admin/pagamentos", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const { status, mes, ano, alunoId } = req.query;
    
    // Filtros
    const filtros = {};
    if (status) filtros.status = status;
    if (mes) filtros.mes = parseInt(mes);
    if (ano) filtros.ano = parseInt(ano);
    if (alunoId) filtros.alunoId = alunoId;
    
    const pagamentos = await Pagamento.find(filtros)
      .populate('alunoId', 'nome email graduacao foto_url')
      .sort({ ano: -1, mes: -1, 'alunoId.nome': 1 });
    
    // Atualizar valores
    const pagamentosAtualizados = pagamentos.map(p => ({
      _id: p._id,
      aluno: p.alunoId,
      mes: p.mes,
      ano: p.ano,
      valorBase: p.valorBase,
      dataVencimento: p.dataVencimento,
      dataPagamento: p.dataPagamento,
      valorPago: p.valorPago,
      multa: p.status === 'pago' ? p.multa : p.multaAtual,
      valorTotal: p.valorTotal,
      diasAtraso: p.diasAtraso,
      status: p.status,
      observacoes: p.observacoes
    }));
    
    res.json(pagamentosAtualizados);
  } catch (error) {
    console.error('Erro ao buscar pagamentos (admin):', error);
    res.status(500).json({ erro: 'Erro ao buscar pagamentos' });
  }
});

// POST /api/admin/pagamentos/criar-mensalidades - Criar mensalidades para um mês
app.post("/api/admin/pagamentos/criar-mensalidades", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const { mes, ano } = req.body;
    
    console.log(' Criar mensalidades:', { mes, ano });
    
    if (!mes || !ano) {
      return res.status(400).json({ erro: 'Mês e ano são obrigatórios' });
    }
    
    // Buscar todos os utilizadores
    const alunos = await User.find({});
    
    console.log(` Total de utilizadores encontrados: ${alunos.length}`);
    
    if (alunos.length === 0) {
      return res.status(404).json({ 
        erro: 'Nenhum utilizador encontrado na base de dados',
        criadas: 0,
        alunos: [],
        erros: ['Não há utilizadores registados']
      });
    }
    
    // Data de vencimento: dia 10 do mês
    const dataVencimento = new Date(ano, mes - 1, 10);
    
    console.log(' Data de vencimento:', dataVencimento);
    
    const mensalidadesCriadas = [];
    const erros = [];
    
    for (const aluno of alunos) {
      try {
        // Verificar se já existe mensalidade para este mês/ano
        const existente = await Pagamento.findOne({
          alunoId: aluno._id,
          mes: parseInt(mes),
          ano: parseInt(ano)
        });
        
        if (existente) {
          console.log(` ${aluno.nome}: Já existe mensalidade`);
          erros.push(`${aluno.nome}: Já existe mensalidade para ${mes}/${ano}`);
          continue;
        }
        
        // Criar mensalidade
        const novaMensalidade = new Pagamento({
          alunoId: aluno._id,
          mes: parseInt(mes),
          ano: parseInt(ano),
          valorBase: 35,
          dataVencimento: dataVencimento,
          status: 'pendente'
        });
        
        await novaMensalidade.save();
        mensalidadesCriadas.push(aluno.nome);
        console.log(` ${aluno.nome}: Mensalidade criada`);
        
      } catch (err) {
        console.error(` Erro para ${aluno.nome}:`, err.message);
        erros.push(`${aluno.nome}: ${err.message}`);
      }
    }
    
    console.log(` Resumo: ${mensalidadesCriadas.length} criadas, ${erros.length} erros`);
    
    res.json({
      mensagem: mensalidadesCriadas.length > 0 
        ? `${mensalidadesCriadas.length} mensalidades criadas com sucesso`
        : 'Nenhuma mensalidade foi criada',
      criadas: mensalidadesCriadas.length,
      totalAlunos: alunos.length,
      alunos: mensalidadesCriadas,
      erros: erros
    });
    
  } catch (error) {
    console.error(' Erro ao criar mensalidades:', error);
    res.status(500).json({ 
      erro: 'Erro ao criar mensalidades',
      detalhes: error.message
    });
  }
});

// POST /api/admin/pagamentos/:id/registar - Registar pagamento
app.post("/api/admin/pagamentos/:id/registar", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const { valorPago, observacoes } = req.body;
    
    if (!valorPago || valorPago <= 0) {
      return res.status(400).json({ erro: 'Valor pago inválido' });
    }
    
    const pagamento = await Pagamento.findById(req.params.id);
    
    if (!pagamento) {
      return res.status(404).json({ erro: 'Pagamento não encontrado' });
    }
    
    if (pagamento.status === 'pago') {
      return res.status(400).json({ erro: 'Este pagamento já foi registado' });
    }
    
    // Registar pagamento
    await pagamento.registarPagamento(valorPago, observacoes || '');
    
    res.json({
      mensagem: 'Pagamento registado com sucesso',
      pagamento: {
        _id: pagamento._id,
        valorPago: pagamento.valorPago,
        multa: pagamento.multa,
        dataPagamento: pagamento.dataPagamento,
        status: pagamento.status
      }
    });
    
  } catch (error) {
    console.error('Erro ao registar pagamento:', error);
    res.status(500).json({ erro: 'Erro ao registar pagamento' });
  }
});

// DELETE /api/admin/pagamentos/:id - Eliminar pagamento
app.delete("/api/admin/pagamentos/:id", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const pagamento = await Pagamento.findById(req.params.id);
    
    if (!pagamento) {
      return res.status(404).json({ erro: 'Pagamento não encontrado' });
    }
    
    if (pagamento.status === 'pago') {
      return res.status(400).json({ 
        erro: 'Não é possível eliminar um pagamento já registado',
        sugestao: 'Contacte o administrador do sistema'
      });
    }
    
    await Pagamento.findByIdAndDelete(req.params.id);
    
    res.json({ mensagem: 'Pagamento deletado com sucesso' });
    
  } catch (error) {
    console.error('Erro ao eliminar pagamento:', error);
    res.status(500).json({ erro: 'Erro ao eliminar pagamento' });
  }
});

// GET /api/admin/stats-pagamentos - Estatísticas de pagamentos
app.get("/api/admin/stats-pagamentos", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const totalPagamentos = await Pagamento.countDocuments();
    const pagos = await Pagamento.countDocuments({ status: 'pago' });
    const pendentes = await Pagamento.countDocuments({ status: 'pendente' });
    const atrasados = await Pagamento.countDocuments({ status: 'atrasado' });
    
    // Total arrecadado
    const pagamentosPagos = await Pagamento.find({ status: 'pago' });
    const totalArrecadado = pagamentosPagos.reduce((sum, p) => sum + p.valorPago, 0);
    
    // Total pendente (com multas atuais)
    const pagamentosPendentes = await Pagamento.find({ status: { $ne: 'pago' } });
    const totalPendente = pagamentosPendentes.reduce((sum, p) => sum + p.valorTotal, 0);
    
    // Total em multas (apenas dos pagos)
    const totalMultas = pagamentosPagos.reduce((sum, p) => sum + p.multa, 0);
    
    res.json({
      total: totalPagamentos,
      pagos: pagos,
      pendentes: pendentes,
      atrasados: atrasados,
      totalArrecadado: totalArrecadado.toFixed(2),
      totalPendente: totalPendente.toFixed(2),
      totalMultas: totalMultas.toFixed(2),
      taxaPagamento: totalPagamentos > 0 ? ((pagos / totalPagamentos) * 100).toFixed(1) : 0
    });
    
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ erro: 'Erro ao buscar estatísticas' });
  }
});

// ========== TRATAMENTO DE ERROS 404 ==========
app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada" });
});

// ========== INICIAR SERVIDOR ==========
const PORT = process.env.PORT || 3000;

// Verificar se a pasta de fotos existe
const fotosPath = path.join(__dirname, 'media/atletas');
if (fs.existsSync(fotosPath)) {
  console.log(' Pasta de fotos encontrada:', fotosPath);
} else {
  console.log(' Pasta de fotos NÃO existe! Criando...');
  fs.mkdirSync(fotosPath, { recursive: true });
  console.log(' Pasta criada:', fotosPath);
}

app.listen(PORT, () => {
  console.log('\n ================================');
  console.log(` Servidor a correr na porta ${PORT}`);
  console.log(` Aceder: http://localhost:${PORT}`);
  console.log(' API Endpoints disponíveis:');
  console.log('   POST   /api/registo');
  console.log('   POST   /api/login');
  console.log('   GET    /api/perfil (protegido)');
  console.log('   PUT    /api/perfil (protegido)');
  console.log('   PUT    /api/alterar-pass (protegido)');
  console.log('   DELETE /api/perfil (protegido)');
  console.log('   GET    /api/utilizadores');
  console.log('   GET    /api/atletas');
  console.log('');
  console.log('‍ ROTAS ADMIN (Faixa Preta + Castanha):');
  console.log('   GET    /api/admin/stats');
  console.log('   GET    /api/admin/utilizadores');
  console.log('   GET    /api/admin/utilizador/:id');
  console.log('   PUT    /api/admin/utilizador/:id');
  console.log('   DELETE /api/admin/utilizador/:id');
  console.log('   PUT    /api/admin/tornar-admin/:id');
  console.log('');
  console.log(' ROTAS SUPER ADMIN:');
  console.log('   GET    /api/superadmin/admins');
  console.log('   PUT    /api/superadmin/tornar-superadmin/:id');
  console.log('   GET    /api/superadmin/stats-avancadas');
  console.log('   GET    /api/superadmin/logs');
  console.log('');
  console.log(' ROTAS DE AULAS:');
  console.log('   GET    /api/aulas - Listar aulas');
  console.log('   GET    /api/minhas-inscricoes (protegido)');
  console.log('   POST   /api/aulas/:id/inscrever (protegido)');
  console.log('   DELETE /api/aulas/:id/desinscrever (protegido)');
  console.log('');
  console.log('  ROTAS ADMIN AULAS:');
  console.log('   GET    /api/admin/aulas');
  console.log('   POST   /api/admin/aulas');
  console.log('   PUT    /api/admin/aulas/:id');
  console.log('   DELETE /api/admin/aulas/:id');
  console.log('   GET    /api/admin/aulas/:id/alunos');
  console.log('');
  console.log(' ROTAS DE PAGAMENTOS:');
  console.log('   GET    /api/meus-pagamentos (protegido)');
  console.log('   GET    /api/meus-pagamentos/pendentes (protegido)');
  console.log('');
  console.log('  ROTAS ADMIN PAGAMENTOS:');
  console.log('   GET    /api/admin/pagamentos');
  console.log('   POST   /api/admin/pagamentos/criar-mensalidades');
  console.log('   POST   /api/admin/pagamentos/:id/registar');
  console.log('   DELETE /api/admin/pagamentos/:id');
  console.log('   GET    /api/admin/stats-pagamentos');
  console.log('');
  console.log(' FICHEIROS ESTÁTICOS:');
  console.log('   GET    /media/atletas/* - Fotos dos atletas');
  console.log('   Pasta: ' + path.join(__dirname, 'media/atletas'));
  console.log('================================\n');
});