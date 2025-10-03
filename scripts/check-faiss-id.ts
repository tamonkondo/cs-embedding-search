import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  const faiss = process.env.FAISS_URL;
  const dburl = process.env.DATABASE_URL;
  if (!faiss || !dburl) {
    throw new Error('Set FAISS_URL and DATABASE_URL in env');
  }

  // 1) /ids からサンプル取得
  const ids: string[] = await fetch(faiss + '/ids').then(r => r.json());
  if (!ids?.length) throw new Error('FAISS /ids returned 0');
  const sample = ids.slice(0, 5);
  console.log('FAISS ids count =', ids.length, 'samples =', sample);

  // 2) Neon にそのIDが存在するか（型キャストに依存しない安全版）
  //    ※ index利用は落ちますが存在確認目的なのでOK
  const c = new Client({ connectionString: dburl });
  await c.connect();
  const { rows: [r1] } = await c.query(
    'SELECT COUNT(*)::int AS c FROM knowledge_units WHERE id::text = $1',
    [sample[0]],
  );
  console.log('First id exists via text-compare?', r1.c > 0);

  // 3) 配列での一致数（text比較の安全版）
  const { rows: [r2] } = await c.query(
    `SELECT COUNT(*)::int AS c
       FROM knowledge_units
      WHERE id::text = ANY($1::text[])`,
    [sample],
  );
  console.log('Matched among first 5 (text ANY):', r2.c);

  // 4) uuidキャストでも試す（通れば最終的なSQLに使える）
  try {
    const { rows: [r3] } = await c.query(
      `SELECT COUNT(*)::int AS c
         FROM knowledge_units
        WHERE id = ANY(SELECT CAST(x AS uuid) FROM unnest($1::text[]) AS t(x))`,
      [sample],
    );
    console.log('Matched among first 5 (uuid ANY+CAST):', r3.c);
  } catch (e) {
    console.warn('uuid ANY+CAST failed, will keep text comparison for now:', (e as Error).message);
  }

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });