import mysql from 'mysql2/promise';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

async function run() {
  const host = env.IXC_DB_HOST || env.IXC_DATABASE_HOST || '10.254.1.3';
  const port = Number(env.IXC_DB_PORT || env.IXC_DATABASE_PORT || 3306);
  const user = env.IXC_DB_USER || env.IXC_DATABASE_USER || 'will';
  const password = env.IXC_DB_PASS || env.IXC_DATABASE_PASSWORD;
  const database = env.IXC_DB_NAME || env.IXC_DATABASE_NAME || 'ixcprovedor';

  const conn = await mysql.createConnection({ host, port, user, password, database });

  const [fusoes] = await conn.query(`
    SELECT f.*,
           eo.descricao as orig_nome, eo.tipo as orig_tipo, t_orig.nome_tipo as orig_tipo_nome,
           ed.descricao as dest_nome, ed.tipo as dest_tipo, t_dest.nome_tipo as dest_tipo_nome
    FROM df_fusao f
    LEFT JOIN df_elemento eo ON eo.id = f.id_elemento_origem
    LEFT JOIN df_tipo_elemento t_orig ON t_orig.id = eo.id_tipo_elemento
    LEFT JOIN df_elemento ed ON ed.id = f.id_elemento_destino
    LEFT JOIN df_tipo_elemento t_dest ON t_dest.id = ed.id_tipo_elemento
    WHERE f.id_elemento_principal = 10194 AND f.tabela_elemento_principal = 'rad_caixa_ftth'
  `);

  console.log('=== DETAILED FUSOES IN BOX 10194 ===');
  for (const f of fusoes) {
    console.log(`Fusao ${f.id}: [Bandeja ${f.bandeja}]`);
    console.log(`  ORIGEM: ${f.tipo_elemento_origem} ID ${f.id_elemento_origem} (${f.orig_nome} / ${f.orig_tipo_nome}) | Porta: ${f.porta_elemento_origem} | Interface: ${f.interface_elemento_origem} | IO: ${f.io_elemento_origem}`);
    console.log(`  DESTINO: ${f.tipo_elemento_destino} ID ${f.id_elemento_destino} (${f.dest_nome} / ${f.dest_tipo_nome}) | Porta: ${f.porta_elemento_destino} | Interface: ${f.interface_elemento_destino} | IO: ${f.io_elemento_destino}`);
    console.log('--------------------------------------------------');
  }

  // Also check how cables enter/exit the box!
  // In the user's screenshot:
  // Left:
  // "Entrada - FLAT Verde-A 205"
  // [Tube 1 (green)] ---> connected to spliter 90/10 [input 1]
  // spliter 90/10 has:
  // - Output 1 (green 90% or 10%)
  // - Output 2 (yellow / white)
  // And look at the connections in the screenshot:
  // 1. Input: Entrada - FLAT Verde-A 205 (Port 1 green) -> spliter 90/10 input (Port 1 green)
  // 2. spliter 90/10 output 1 -> goes to "Saída - FLAT Verde-A 205" (Port 1 green)
  // 3. spliter 90/10 output 2 (yellow/white) -> goes to "spliter 1/8" input (Port 1 / Port 2)
  // 4. spliter 1/8 output (portas de atendimento para clientes)

  await conn.end();
}

run().catch(console.error);
