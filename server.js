const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const connectionString = "postgres://postgres:[LUIDI_RIBEIRO]@db.tcnoqdnzhcbnksmqkjlp.supabase.co:5432/postgres";

const pool = new Pool({
  connectionString: connectionString,
});

const setupDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS keys (
                nome TEXT PRIMARY KEY,
                expira BIGINT,
                hwid TEXT
            )
        `);
        console.log("✅ Banco de Dados Supabase conectado!");
    } catch (err) {
        console.error("❌ Erro ao conectar no banco:", err);
    }
};
setupDB();

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

app.get("/keys", async (req, res) => {
    const result = await pool.query("SELECT * FROM keys");
    let obj = {};
    result.rows.forEach(k => {
        obj[k.nome] = { expira: k.expira, hwid: k.hwid };
    });
    res.json(obj);
});

app.get("/delete", async (req, res) => {
    await pool.query("DELETE FROM keys WHERE nome = $1", [req.query.key]);
    res.json({ status: "deletada" });
});

app.listen(process.env.PORT || 3000, () => console.log("🚀 API PRO ON"));