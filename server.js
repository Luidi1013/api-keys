const express = require("express");
const admin = require("firebase-admin");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Tenta carregar as credenciais do Firebase
try {
    const serviceAccount = require("./firebase-key.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://painel-keys-lr-store-default-rtdb.firebaseio.com/"
    });
    console.log("✅ Conectado ao Firebase com sucesso!");
} catch (error) {
    console.error("❌ Erro crítico ao carregar firebase-key.json:", error.message);
}

const db = admin.database();
const ref = db.ref("keys");

// Rota para Criar Key
app.post("/criarkey", async (req, res) => {
    try {
        const { key, dias } = req.body;
        if (!key || !dias) return res.status(400).json({ status: "erro", msg: "Dados incompletos" });
        
        const expira = Date.now() + (parseInt(dias) * 86400000);
        await ref.child(key).set({ expira, hwid: null });
        res.json({ status: "ok" });
    } catch (e) {
        res.status(500).json({ status: "erro", msg: e.message });
    }
});

// Rota para Listar Keys
app.get("/keys", async (req, res) => {
    try {
        const snapshot = await ref.once("value");
        res.json(snapshot.val() || {});
    } catch (e) {
        res.json({});
    }
});

// Rota para Verificar (Roblox)
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
    } catch (e) {
        res.json({ status: "erro" });
    }
});

// Rota para Deletar
app.get("/delete", async (req, res) => {
    try {
        await ref.child(req.query.key).remove();
        res.json({ status: "deletada" });
    } catch (e) {
        res.json({ status: "erro" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));