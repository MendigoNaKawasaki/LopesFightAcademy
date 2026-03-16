document.getElementById("fileInput").addEventListener("change", function() {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(event) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(event.target.result, "text/html");

        // Buscar dados do HTML
        document.getElementById("nome").value = doc.querySelector("h1").innerText.split(" ")[0];
        document.getElementById("apelido").value = doc.querySelector("h1").innerText.split(" ")[1];

        const listItems = doc.querySelectorAll("ul li");

        document.getElementById("nacionalidade").value = listItems[0].innerText.replace("Nacionalidade: ", "");
        document.getElementById("dsn").value = listItems[1].innerText.replace("Data de Nascimento: ", "");
        document.getElementById("idade").value = listItems[2].innerText.replace("Idade: ", "").replace(" anos", "");
        document.getElementById("altura").value = listItems[3].innerText.replace("Altura: ", "").replace(" m", "");
        document.getElementById("alcance").value = listItems[4].innerText.replace("Alcance: ", "").replace(" cm", "");
        document.getElementById("peso").value = listItems[5].innerText.replace("Peso: ", "").replace(" kg", "");
        document.getElementById("categoria").value = listItems[6].innerText.replace("Categoria de Peso: ", "");

        // Foto
        const fotoSrc = doc.querySelector(".foto img").src;
        document.getElementById("preview").src = fotoSrc;

        window.loadedImage = fotoSrc;
    };

    reader.readAsText(file);
});


// --- Gerar novo HTML atualizado ---
function gerarNovoHTML() {
    const nome = document.getElementById("nome").value.trim();
    const apelido = document.getElementById("apelido").value.trim();
    const nacionalidade = document.getElementById("nacionalidade").value.trim();
    const dsn = document.getElementById("dsn").value;
    const idade = document.getElementById("idade").value;
    const altura = document.getElementById("altura").value;
    const alcance = document.getElementById("alcance").value;
    const peso = document.getElementById("peso").value;
    const categoria = document.getElementById("categoria").value;

    let fotoBase64 = window.loadedImage;

    const newFoto = document.getElementById("foto").files[0];

    if (newFoto) {
        const reader2 = new FileReader();
        reader2.onload = function(e) {
            fotoBase64 = e.target.result;
            gerarArquivoHTML();
        };
        reader2.readAsDataURL(newFoto);
    } else {
        gerarArquivoHTML();
    }

    function gerarArquivoHTML() {
        const html = `
<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${nome} ${apelido}</title>
<link rel="stylesheet" href="css/teste_de_style_atleta.css">
</head>
<body>

<header>
    <a href="index.html"><img src="media/tiny.png" alt="Logo"></a>
</header>

<main>
    <h1>${nome} ${apelido}</h1>

    <section>
        <div class="foto">
            <img src="${fotoBase64}" width="300">
        </div>
        <ul>
            <li><strong>Nacionalidade:</strong> ${nacionalidade}</li>
            <li><strong>Data de Nascimento:</strong> ${dsn}</li>
            <li><strong>Idade:</strong> ${idade} anos</li>
            <li><strong>Altura:</strong> ${altura} m</li>
            <li><strong>Alcance:</strong> ${alcance} cm</li>
            <li><strong>Peso:</strong> ${peso} kg</li>
            <li><strong>Categoria de Peso:</strong> ${categoria}</li>
        </ul>
    </section>

    <section>
        <h2>Sobre</h2>
        <p>-</p>
    </section>

</main>

</body>
</html>`;

        const blob = new Blob([html], { type: "text/html" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${nome}_${apelido}_EDITADO.html`;
        link.click();

        document.getElementById("successMsg").style.display = "block";
        setTimeout(() => {
            document.getElementById("successMsg").style.display = "none";
        }, 3000);
    }
}