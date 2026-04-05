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

app.post("/criarkey", (req, res) => {
    const { key, dias } = req.body;

    const expira = Date.now() + (dias * 86400000);

    keys[key] = { expira };
    salvar();

    res.json({ status: "ok" });
});

app.get("/verificar", (req, res) => {
    const key = req.query.key;

    if (!keys[key]) return res.json({ status: "invalida" });

    if (Date.now() > keys[key].expira)
        return res.json({ status: "expirada" });

    res.json({ status: "valida" });
});

app.listen(3000, () => console.log("API ON"));
