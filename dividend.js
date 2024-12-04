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

const insertDividend = async (symbol, date, dividend) => {
  return new Promise((resolve, reject) => {
    const query = `insert into dividends (symbol, date, dividend) values (?, ?, ?)`;

    connection.query(query, [symbol, date, dividend], (err, result) => {
      if (err) {
        console.log(err);
        reject(err);
      }
      console.log('data inserted: ', symbol, ' ', date, ' ', dividend);
      resolve();
    });
  });
};

const getDividend = async (symbol, from) => {
  const endpoint = `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${symbol}`;
  const params = `?apikey=${process.env.FMP_API_KEY}&from=${from}`;

  const resp = await axios.get(endpoint + params);
  return resp.data.historical;
};

const getDividendsAndInsert = async (file) => {
  const assets = JSON.parse(fs.readFileSync(file, 'utf8'));
  const from = '1995-01-01';

  for (const asset of assets) {
    try {
      const dividends = await getDividend(asset.symbol, from);

      for (const dividend of dividends) {
        if (dividend.dividend != null) {
          insertDividend(asset.symbol, dividend.date, dividend.dividend);
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
};

await getDividendsAndInsert('results/assets.json');

connection.end();
