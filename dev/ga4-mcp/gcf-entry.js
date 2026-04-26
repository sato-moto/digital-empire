import { main } from './analytics-daily.js';

// Cloud Functions (Gen 2) のHTTPエントリーポイント
export const analyticsDaily = async (req, res) => {
  try {
    await main();
    res.status(200).send('OK');
  } catch (err) {
    console.error('[Cloud Functions Error]', err);
    res.status(500).send(err.message);
  }
};
