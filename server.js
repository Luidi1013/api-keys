const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

// carregar keys
let keys = {};

if (fs.existsSync("keys.json")) {
    keys = JSON.parse(fs.readFileSync("keys.json"));
}

// salvar keys
function salvar() {
    fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));
}

// criar key
app.post("/criarkey", (req, res) => {
    const { key, dias } = req.body;

    if (!key || !dias) {
        return res.json({ status: "erro", msg: "dados inválidos" });
    }

    const diasNumero = parseInt(dias);
    if (isNaN(diasNumero)) {
        return res.json({ status: "erro", msg: "dias inválido" });
    }

    const expira = Date.now() + (diasNumero * 86400000);

    keys[key] = {
        expira: expira
    };

    salvar();

    res.json({
        status: "ok",
        key: key,
        expira: expira
    });
});

// verificar key
app.get("/verificar", (req, res) => {
    const key = req.query.key;

    if (!key || !keys[key]) {
        return res.json({ status: "invalida" });
    }

    const agora = Date.now();

    if (agora > keys[key].expira) {
        return res.json({ status: "expirada" });
    }

    res.json({
        status: "valida",
        expira: keys[key].expira
    });
});

// iniciar servidor
app.listen(3000, () => {
    console.log("API ON na porta 3000");
});