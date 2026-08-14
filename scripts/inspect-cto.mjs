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

  // Search all tables in ixcprovedor that might be related to map, fiber, network, splitters, fusions, etc.
  const [tables] = await conn.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = ?
    ORDER BY table_name
  `, [database]);

  const allNames = tables.map(t => t.TABLE_NAME || t.table_name);
  console.log(`Total tables: ${allNames.length}`);

  const networkTables = allNames.filter(name => 
    name.startsWith('rad_') || 
    name.startsWith('df_') || 
    name.startsWith('map_') || 
    name.includes('fibra') || 
    name.includes('cabo') || 
    name.includes('splitter') || 
    name.includes('fusao') || 
    name.includes('porta') || 
    name.includes('slot') || 
    name.includes('drop') || 
    name.includes('cto') ||
    name.includes('desenho') ||
    name.includes('elemento') ||
    name.includes('conexao') ||
    name.includes('pon') ||
    name.includes('olt')
  );

  console.log('Network related tables:', networkTables);

  // For each of these tables, search for column values containing 10194 or references to rad_caixa_ftth
  for (const t of networkTables) {
    try {
      const [cols] = await conn.query(`DESCRIBE \`${t}\``);
      const colNames = cols.map(c => c.Field);
      
      const relevantCols = colNames.filter(c => 
        c.includes('caixa') || 
        c.includes('elemento') || 
        c.includes('transmissor') || 
        c.includes('id_pon') ||
        c.includes('cto') ||
        c.includes('origem') ||
        c.includes('destino')
      );

      for (const col of relevantCols) {
        const [matching] = await conn.query(`SELECT * FROM \`${t}\` WHERE \`${col}\` = 10194 LIMIT 5`);
        if (matching.length > 0) {
          console.log(`\n>>> Table ${t} [col: ${col}] matches 10194 (${matching.length} rows):`, matching);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  await conn.end();
}

run().catch(console.error);
