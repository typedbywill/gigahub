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

  // List all tables containing df_ or rad_
  const [tables] = await conn.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = ? AND (table_name LIKE 'df_%' OR table_name LIKE 'rad_%')
    ORDER BY table_name
  `, [database]);

  console.log('Tables found:', tables.map(t => t.TABLE_NAME || t.table_name));

  // Let's inspect df_* tables (Desenho Fibra / Diagrama Fibra)
  const dfTables = tables.map(t => t.TABLE_NAME || t.table_name).filter(t => t.startsWith('df_'));
  for (const t of dfTables) {
    console.log(`\n================== SCHEMA: ${t} ==================`);
    const [cols] = await conn.query(`DESCRIBE \`${t}\``);
    console.log(cols.map(c => `${c.Field} (${c.Type})`).join(', '));
    
    // Check if there are rows referring to 10194 or id_elemento / id_caixa
    const colNames = cols.map(c => c.Field);
    const hasElementCol = colNames.some(c => c.includes('elemento') || c.includes('caixa') || c.includes('transmissor') || c.includes('projeto'));
    if (hasElementCol) {
      const conditions = colNames.map(c => `\`${c}\` = '10194'`).join(' OR ');
      try {
        const [matching] = await conn.query(`SELECT * FROM \`${t}\` WHERE ${conditions} LIMIT 5`);
        if (matching.length > 0) {
          console.log(`>>> Matched 10194 in ${t}:`, matching);
        }
      } catch (e) {}
    }
  }

  await conn.end();
}

run().catch(console.error);
