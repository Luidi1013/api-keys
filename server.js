const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

try {
    const serviceAccount = require("./firebase-key.json");

    // LIMPEZA DEFINITIVA DA CHAVE: Resolve o erro de JWT Signature
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key
            .replace(/\\n/g, '\n') // Converte \n de texto para quebra de linha real
            .replace(/\n/g, '\n'); // Garante que quebras de linha existentes sejam mantidas
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://painel-keys-lr-store-default-rtdb.firebaseio.com/"
    });
    console.log("✅ Sistema autenticado com o Firebase!");
} catch (e) {
    console.log("❌ Erro de inicialização: " + e.message);
}

const db = admin.database();
const ref = db.ref("keys");

app.post("/criarkey", async (req, res) => {
    try {
        const { key, dias } = req.body;
        if (!key || !dias) return res.status(400).json({ error: "Dados ausentes" });
        const expira = Date.now() + (parseInt(dias) * 86400000);
        await ref.child(key).set({ expira, hwid: null });
        res.json({ status: "ok" });
    } catch (e) {
        res.status(500).json({ error: "Erro no Firebase: " + e.message });
    }
});

app.get("/keys", async (req, res) => {
    try {
        const snapshot = await ref.once("value");
        res.json(snapshot.val() || {});
    } catch (e) { res.json({}); }
});

app.get("/delete", async (req, res) => {
    try {
        await ref.child(req.query.key).remove();
        res.json({ status: "deletado" });
    } catch (e) { res.json({ error: e.message }); }
});

app.listen(process.env.PORT || 3000, () => console.log("🚀 Servidor Online"));