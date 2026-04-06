const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

let keys = {};

if (fs.existsSync("keys.json")) {
    keys = JSON.parse(fs.readFileSync("keys.json"));
}

function salvar() {
    fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));
}

// 🔑 Criar key
app.post("/criarkey", (req, res) => {
    const { key, dias } = req.body;

    if (!key || !dias) return res.json({ status: "erro" });

    const expira = Date.now() + (parseInt(dias) * 86400000);

    keys[key] = {
        expira: expira,
        hwid: null
    };

    salvar();

    res.json({ status: "ok" });
});

// 🔍 Verificar key + salvar HWID
app.get("/verificar", (req, res) => {
    const key = req.query.key;
    const hwid = req.query.hwid || "unknown";

    if (!keys[key]) return res.json({ status: "invalida" });

    if (Date.now() > keys[key].expira)
        return res.json({ status: "expirada" });

    // 🔐 Anti compartilhamento
    if (!keys[key].hwid) {
        keys[key].hwid = hwid;
        salvar();
    } else if (keys[key].hwid !== hwid) {
        return res.json({ status: "bloqueada" });
    }

    res.json({
        status: "valida",
        expira: keys[key].expira
    });
});

// 📊 Listar keys
app.get("/keys", (req, res) => {
    res.json(keys);
});

// 🗑 Deletar key
app.get("/delete", (req, res) => {
    const key = req.query.key;

    if (!keys[key]) return res.json({ status: "nao_existe" });

    delete keys[key];
    salvar();

    res.json({ status: "deletada" });
});

app.listen(3000, () => console.log("API PRO ON"));

app.use(express.static(__dirname));
app.use(express.json());
