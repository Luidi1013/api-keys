const express = require("express");
const admin = require("firebase-admin");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

try {
    // Caminho onde o Render guarda arquivos secretos
    const secretPath = "/etc/secrets/firebase-key.json";
    let serviceAccount;

    if (fs.existsSync(secretPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(secretPath, "utf8"));
    } else {
        // Fallback para desenvolvimento local
        serviceAccount = require("./firebase-key.json");
    }

    // Corrige quebras de linha que costumam dar erro de assinatura
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://painel-keys-lr-store-default-rtdb.firebaseio.com/"
    });
    console.log("✅ Conectado ao Firebase via Secret File!");
} catch (e) {
    console.log("❌ Erro de Autenticação: " + e.message);
}

const db = admin.database();
const ref = db.ref("keys");

app.post("/criarkey", async (req, res) => {
    try {
        const { key, dias } = req.body;
        const expira = Date.now() + (parseInt(dias) * 86400000);
        await ref.child(key).set({ expira, hwid: null });
        res.json({ status: "ok" });
    } catch (e) { res.status(500).json({ error: e.message }); }
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