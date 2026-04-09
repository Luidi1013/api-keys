const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

try {
    const serviceAccount = require("./firebase-key.json");
    
    // Correção para garantir que quebras de linha na chave privada sejam lidas corretamente
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://painel-keys-lr-store-default-rtdb.firebaseio.com/"
    });
    console.log("✅ Conectado ao Firebase!");
} catch (e) {
    console.log("❌ Erro ao inicializar: " + e.message);
}

const db = admin.database();
const ref = db.ref("keys");

app.post("/criarkey", async (req, res) => {
    try {
        const { key, dias } = req.body;
        const expira = Date.now() + (parseInt(dias) * 86400000);
        await ref.child(key).set({ expira, hwid: null });
        res.json({ status: "ok" });
    } catch (e) {
        res.status(500).json({ error: e.message });
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

app.get("/verificar", async (req, res) => {
    const keyNome = req.query.key;
    const hwid = req.query.hwid || "unknown";
    try {
        const snapshot = await ref.child(keyNome).once("value");
        const data = snapshot.val();
        if (!data) return res.json({ status: "invalida" });
        if (Date.now() > data.expira) return res.json({ status: "expirada" });
        if (!data.hwid) {
            await ref.child(keyNome).update({ hwid });
            return res.json({ status: "valida", expira: data.expira });
        } else if (data.hwid !== hwid) {
            return res.json({ status: "bloqueada" });
        }
        res.json({ status: "valida", expira: data.expira });
    } catch (e) { res.json({ status: "erro" }); }
});

app.listen(process.env.PORT || 3000, () => console.log("🚀 Servidor Online"));