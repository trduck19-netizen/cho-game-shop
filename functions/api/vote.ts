import { getSettingD1, setSettingD1 } from '../services/d1_service';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  try {
    const body: { code: string; type: 'up' | 'down' } = await request.json();
    const { code, type } = body;

    if (!code || !type) {
      return new Response(JSON.stringify({ error: 'Missing code or type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = `vote:${code.toUpperCase()}`;
    let voteRecord = { up: 0, down: 0 };

    if (env.DB) {
      try {
        const existing = await getSettingD1(env.DB, key);
        if (existing && typeof existing === 'object') {
          voteRecord = existing as { up: number; down: number };
        }
      } catch (e) {
        console.error('D1 get vote error:', e);
      }
    }

    if (type === 'up') voteRecord.up += 1;
    else voteRecord.down += 1;

    if (env.DB) {
      try {
        await setSettingD1(env.DB, key, voteRecord);
      } catch (e) {
        console.error('D1 put vote error:', e);
      }
    }

    return new Response(JSON.stringify({ success: true, result: voteRecord }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
