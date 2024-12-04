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

const insertSplit = async (symbol, date, numerator, denominator) => {
  return new Promise((resolve, reject) => {
    const query = `insert into splits (symbol, date, numerator, denominator) values (?, ?, ?, ?)`;
    const max = 2000000000;

    let formattedNumerator = numerator;
    let formattedDenominator = denominator;

    while (formattedDenominator > max || formattedNumerator > max) {
      formattedNumerator /= 10;
      formattedDenominator /= 10;
    }

    connection.query(
      query,
      [symbol, date, formattedNumerator, formattedDenominator],
      (err, result) => {
        if (err) {
          console.log(err);
          reject(err);
        }
        console.log(
          'data inserted: ',
          symbol,
          ' ',
          date,
          ' ',
          numerator,
          ' ',
          denominator
        );

        if (
          numerator != formattedNumerator ||
          denominator != formattedDenominator
        ) {
          console.log('formatted: ', formattedNumerator, formattedDenominator);
        }

        resolve();
      }
    );
  });
};

const getSplit = async (symbol, from) => {
  const endpoint = `https://financialmodelingprep.com/api/v3/historical-price-full/stock_split/${symbol}`;
  const params = `?apikey=${process.env.FMP_API_KEY}&from=${from}`;

  const resp = await axios.get(endpoint + params);
  return resp.data.historical;
};

const getSplitsAndInsert = async (file) => {
  const assets = JSON.parse(fs.readFileSync(file, 'utf8'));
  const from = '1995-01-01';

  for (const asset of assets) {
    try {
      const splits = await getSplit(asset.symbol, from);

      for (const split of splits) {
        if (split.numerator != null && split.denominator != null) {
          insertSplit(
            asset.symbol,
            split.date,
            split.numerator,
            split.denominator
          );
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
};

await getSplitsAndInsert('results/assets.json');

connection.end();
