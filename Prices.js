import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import mysql from 'mysql2';

dotenv.config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

const getPrices = async (symbol, from, to) => {
  const endpoint = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}`;
  const params = `?apikey=${process.env.FMP_API_KEY}&from=${from}&to=${to}`;

  const resp = await axios.get(endpoint + params);
  return resp.data.historical;
};

const insertPrice = async (symbol, date, close) => {
  return new Promise((resolve, reject) => {
    const query = `insert into prices (symbol, date, close) values (?, ?, ?)`;

    connection.query(query, [symbol, date, close], (err, result) => {
      if (err) {
        console.log(err);
        reject(err);
      }
      console.log('data inserted: ', symbol, ' ', date);
      resolve();
    });
  });
};

const getPricesAtBeginningOfMonth = async (file) => {
  const assets = JSON.parse(fs.readFileSync(file, 'utf8'));

  for (const asset of assets) {
    const from = '1995-01-01';
    const to = '2024-12-10';

    try {
      const prices = await getPrices(asset.symbol, from, to);

      if (!prices) {
        console.log('continue ', asset.symbol);
        continue;
      }

      let prevMonth = '2024-13';
      for (let i = prices.length - 1; i >= 0; i--) {
        const price = prices[i];
        const currentMonth = price.date.substring(0, 7);
        if (currentMonth != prevMonth) {
          await insertPrice(asset.symbol, price.date, price.close);
          prevMonth = currentMonth;
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
};

await getPricesAtBeginningOfMonth('results/assetsForPrices.json');
connection.end();
