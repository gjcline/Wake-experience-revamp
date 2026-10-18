// GET /api/runs: every run and booking, for the dashboard. Needs the DASHBOARD_KEY in the
// x-dashboard-key header.
import { all, json } from './_store.js';

export async function GET(request) {
  const key = process.env.DASHBOARD_KEY;
  if (!key || request.headers.get('x-dashboard-key') !== key) return json({ ok: false }, 401);
  const [runs, bookings] = await Promise.all([all('runs/', 2000), all('bookings/', 2000)]);
  return json({ ok: true, runs, bookings });
}
