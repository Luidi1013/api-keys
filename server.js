const express = require("express");
const admin = require("firebase-admin");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

try {
    const serviceAccount = require("./firebase-key.json");

    // Correção crucial para a chave privada aceitar quebras de linha corretamente
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://painel-keys-lr-store-default-rtdb.firebaseio.com/"
    });
    console.log("✅ Conectado ao Firebase com sucesso!");
} catch (e) {
    console.log("❌ Erro na conexão: " + e.message);
}

const db = admin.database();
const ref = db.ref("keys");

app.post("/criarkey", async (req, res) => {
    try {
        const { key, dias } = req.body;
        if (!key || !dias) return res.status(400).json({ error: "Dados incompletos" });

        const expira = Date.now() + (parseInt(dias) * 86400000);
        await ref.child(key).set({ expira, hwid: null }); // Salva no banco de dados
        res.json({ status: "ok" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/keys", async (req, res) => {
    try {
        const snapshot = await ref.once("value");
        res.json(snapshot.val() || {}); // Carrega do banco de dados
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/delete", async (req, res) => {
    try {
        await ref.child(req.query.key).remove();
        res.json({ status: "deletado" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(process.env.PORT || 3000, () => console.log("🚀 Servidor Online"));