// Registo
fetch('/api/registo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nome, idade, arte_marcial, email, senha })
})
.then(res => res.json())
.then(data => {
  localStorage.setItem('token', data.token);
  window.location.href = 'index.html';
});

// Login
fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, senha })
})
.then(res => res.json())
.then(data => {
  localStorage.setItem('token', data.token);
  window.location.href = 'index.html';
});

// Acessar rota protegida
fetch('/api/perfil', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
.then(res => res.json())
.then(data => console.log(data));