const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const XLSX = require("xlsx");

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("public"));

const db = new sqlite3.Database("./database.db");

const ADMIN_PASSWORD = "0l1T3";
const MAX_OPERARIOS = 40;
const MAX_ALQUILER = 4;

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const TU_NUMERO = "34653077132";

db.run(`
CREATE TABLE IF NOT EXISTS inscripciones (
id INTEGER PRIMARY KEY AUTOINCREMENT,
pertenece_club TEXT,
nick_club TEXT,
nombre TEXT,
apellido1 TEXT,
apellido2 TEXT,
dni TEXT,
origen TEXT,
nick TEXT,
club_externo TEXT,
nombre_club TEXT,
rol TEXT,
novato TEXT,
alquila TEXT,
fecha DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);

async function enviarWhatsApp(numero, mensaje) {
if (!WHATSAPP_TOKEN) return;

await axios.post(
`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
{
messaging_product: "whatsapp",
to: numero,
type: "text",
text: { body: mensaje }
},
{
headers: {
Authorization: `Bearer ${WHATSAPP_TOKEN}`,
"Content-Type": "application/json"
}
}
);
}

app.get("/contador", (req, res) => {
db.get("SELECT COUNT(*) as total FROM inscripciones", (err, row) => {
res.json({
ocupadas: row.total,
restantes: MAX_OPERARIOS - row.total
});
});
});

app.post("/inscribir", (req, res) => {
const data = req.body;

db.get("SELECT COUNT(*) as total FROM inscripciones", (err, totalRow) => {

if (totalRow.total >= MAX_OPERARIOS)
return res.status(400).json({ error: "INSCRIPCIONES CERRADAS - CUPO COMPLETO" });

db.get("SELECT COUNT(*) as total FROM inscripciones WHERE alquila='SI'", (err, alquilerRow) => {

if (alquilerRow.total >= MAX_ALQUILER && data.alquila === "SI")
return res.status(400).json({ error: "CUPO DE ALQUILER COMPLETO (4/4)" });

db.run(`
INSERT INTO inscripciones (
pertenece_club,nick_club,nombre,apellido1,apellido2,
dni,origen,nick,club_externo,nombre_club,
rol,novato,alquila
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
[
data.pertenece_club,
data.nick_club,
data.nombre,
data.apellido1,
data.apellido2,
data.dni,
data.origen,
data.nick,
data.club_externo,
data.nombre_club,
data.rol,
data.novato,
data.alquila
]);

// Aviso a ti
enviarWhatsApp(TU_NUMERO,
`⚔️ NUEVO OPERADOR UCT ⚔️
${data.nombre} ${data.apellido1}
Nick: ${data.nick}
Rol: ${data.rol}
Alquila: ${data.alquila}`);

// Confirmación al jugador (si quieres recoger teléfono en futuro)
res.json({ success: true });

});
});
});

app.get("/admin", (req, res) => {
if (req.query.pass !== ADMIN_PASSWORD)
return res.send("ACCESO DENEGADO");

db.all("SELECT * FROM inscripciones", [], (err, rows) => {
res.json(rows);
});
});

app.get("/exportar", (req, res) => {
db.all("SELECT * FROM inscripciones", [], (err, rows) => {

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(rows);
XLSX.utils.book_append_sheet(wb, ws, "Operarios");

const file = "Operarios_UCT_Black_Dragon.xlsx";
XLSX.writeFile(wb, file);
res.download(file);
});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("UCT BLACK DRAGON OPERATIVO"));
