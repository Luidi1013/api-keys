const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// 🔗 Connection String com sua senha aplicada
const connectionString = "postgres://postgres:LUIDI%20RIBEIRO@db.tcnoqdnzhcbnksmqkjlp.supabase.co:5432/postgres?sslmode=require";

const pool = new Pool({
  connectionString: connectionString,
});

// Cria a tabela automaticamente se não existir no Supabase
const setupDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS keys (
                nome TEXT PRIMARY KEY,
                expira BIGINT,
                hwid TEXT
            )
        `);
        console.log("✅ Banco de Dados Supabase Conectado e Pronto!");
    } catch (err) {
        console.error("❌ Erro ao conectar no Supabase:", err);
    }
};
setupDB();

// 🔑 Rota para Criar Key (Usada pelo seu index.html)
app.post("/criarkey", async (req, res) => {
    const { key, dias } = req.body;
    if (!key || !dias) return res.json({ status: "erro" });

    const expira = Date.now() + (parseInt(dias) * 86400000);
    try {
        await pool.query(
            "INSERT INTO keys (nome, expira, hwid) VALUES ($1, $2, $3) ON CONFLICT (nome) DO UPDATE SET expira = $2, hwid = NULL",
            [key, expira, null]
        );
        res.json({ status: "ok" });
    } catch (e) { res.json({ status: "erro" }); }
});

// 🔍 Rota de Verificação (Usada pelo seu menu.lua)
app.get("/verificar", async (req, res) => {
    const keyNome = req.query.key;
    const hwid = req.query.hwid || "unknown";

    try {
        const result = await pool.query("SELECT * FROM keys WHERE nome = $1", [keyNome]);
        const data = result.rows[0];

        if (!data) return res.json({ status: "invalida" });
        if (Date.now() > data.expira) return res.json({ status: "expirada" });

        if (!data.hwid) {
            await pool.query("UPDATE keys SET hwid = $1 WHERE nome = $2", [hwid, keyNome]);
        } else if (data.hwid !== hwid) {
            return res.json({ status: "bloqueada" });
        }

        res.json({ status: "valida", expira: data.expira });
    } catch (e) { res.json({ status: "erro" }); }
});

// 📊 Listar chaves para o painel
app.get("/keys", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM keys");
        let obj = {};
        result.rows.forEach(k => {
            obj[k.nome] = { expira: k.expira, hwid: k.hwid };
        });
        res.json(obj);
    } catch (e) { res.json({}); }
});

// 🗑 Deletar chave
app.get("/delete", async (req, res) => {
    try {
        await pool.query("DELETE FROM keys WHERE nome = $1", [req.query.key]);
        res.json({ status: "deletada" });
    } catch (e) { res.json({ status: "erro" }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 API ONLINE E SEGURA"));