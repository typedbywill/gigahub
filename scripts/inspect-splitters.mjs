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

  // Let's check all columns of df_tipo_elemento for splitters and cables
  const [splitterTypes] = await conn.query(`
    SELECT id, nome_tipo, splitter_numero_entradas, splitter_numero_saidas, splitter_tipo, splitter_proporcao, cor_ativa, cor_fundo
    FROM df_tipo_elemento 
    WHERE id_categoria_tipo = 2 OR splitter_tipo IS NOT NULL OR nome_tipo LIKE '%spliter%' OR nome_tipo LIKE '%splitter%'
  `);
  console.log('=== SPLITTER TYPES ===', splitterTypes);

  // Let's check how clientes/ONUs are linked to ports in rad_caixa_ftth
  const [onus] = await conn.query(`
    SELECT id, nome, onu_tipo, mac, sinal_rx, sinal_tx, porta_ftth, status_potencia, id_contrato
    FROM rad_usuarios
    WHERE id_caixa_ftth = 10194
  `);
  console.log('=== ONUS IN CAIXA 10194 (rad_usuarios) ===', onus);

  // Check if there are other tables like rad_caixa_ftth_splitters or similar
  const [matchingTables] = await conn.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = ? AND table_name LIKE '%caixa_ftth%'
  `, [database]);
  console.log('=== CAIXA FTTH TABLES ===', matchingTables);

  await conn.end();
}

run().catch(console.error);
