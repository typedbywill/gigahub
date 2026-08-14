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

  console.log('\n=== FUSOES IN BOX 10194 (id_elemento_principal = 10194) ===');
  const [fusoes] = await conn.query(`
    SELECT * FROM df_fusao 
    WHERE id_elemento_principal = 10194 AND tabela_elemento_principal = 'rad_caixa_ftth'
  `);
  console.log('Fusoes count:', fusoes.length);
  console.log(JSON.stringify(fusoes, null, 2));

  // Let's get elements directly inside box 10194 or parent = 10194
  const [elemsInBox] = await conn.query(`
    SELECT e.*, t.nome_tipo, t.splitter_proporcao, t.splitter_numero_entradas, t.splitter_numero_saidas, t.splitter_tipo, t.cabo_numero_loose_tube, t.cabo_numero_fibras
    FROM df_elemento e
    LEFT JOIN df_tipo_elemento t ON t.id = e.id_tipo_elemento
    WHERE e.id_elemento_pai = 10194 OR e.id = 10194
  `);
  console.log('\n=== DIRECT ELEMENTS WITH PARENT 10194 ===');
  console.log(JSON.stringify(elemsInBox, null, 2));

  // Check df_elemento referenced in fusoes
  const elemIds = new Set();
  for (const f of fusoes) {
    if (f.id_elemento_origem) elemIds.add(f.id_elemento_origem);
    if (f.id_elemento_destino) elemIds.add(f.id_elemento_destino);
  }
  if (elemIds.size > 0) {
    const [referencedElems] = await conn.query(`
      SELECT e.*, t.nome_tipo, t.splitter_proporcao, t.splitter_numero_entradas, t.splitter_numero_saidas, t.splitter_tipo, t.cabo_numero_loose_tube, t.cabo_numero_fibras
      FROM df_elemento e
      LEFT JOIN df_tipo_elemento t ON t.id = e.id_tipo_elemento
      WHERE e.id IN (${Array.from(elemIds).join(',')})
    `);
    console.log('\n=== ELEMENTS REFERENCED IN FUSOES ===');
    console.log(JSON.stringify(referencedElems, null, 2));
  }

  // Also check cables connected to box 10194
  // In IXC, how is a cable connected to a box?
  // Let's check df_coordenadas or df_elemento where id_elemento = 10194 or df_fusao
  const [caboFusao] = await conn.query(`
    SELECT * FROM df_fusao 
    WHERE (id_elemento_origem = 10194 OR id_elemento_destino = 10194)
  `);
  console.log('\n=== FUSOES WHERE BOX 10194 IS ORIGIN/DEST ===');
  console.log(JSON.stringify(caboFusao, null, 2));

  // Check color pattern
  const [padraoCores] = await conn.query('SELECT * FROM df_padrao_cores');
  console.log('\n=== PADRAO CORES ===');
  console.log(JSON.stringify(padraoCores, null, 2));

  await conn.end();
}

run().catch(console.error);
