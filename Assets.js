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

const getStocksOfExchange = async (exchange) => {
  try {
    const endpoint = `https://financialmodelingprep.com/api/v3/symbol/${exchange}?apikey=${process.env.FMP_API_KEY}`;
    const resp = await axios.get(endpoint);

    const filteredStocks = resp.data.map((stock) => ({
      symbol: stock.symbol,
      name: stock.name,
    }));

    fs.writeFileSync(
      `results/stocksOf${exchange}.json`,
      JSON.stringify(filteredStocks, null, 2)
    );
  } catch (err) {
    console.log(err);
  }
};

const getETF = async () => {
  try {
    const endpoint = `https://financialmodelingprep.com/api/v3/etf/list?apikey=${process.env.FMP_API_KEY}`;
    const resp = await axios.get(endpoint);

    const filteredStocks = resp.data
      .filter(
        (stock) =>
          stock.exchangeShortName === 'NYSE' ||
          stock.exchangeShortName === 'NASDAQ' ||
          stock.exchangeShortName === 'KSC' ||
          stock.exchangeShortName === 'KOE'
      )
      .map((stock) => ({
        symbol: stock.symbol,
        name: stock.name,
        exchange: stock.exchangeShortName,
      }));

    fs.writeFileSync(
      `results/ETF.json`,
      JSON.stringify(filteredStocks, null, 2)
    );
  } catch (err) {
    console.log(err);
  }
};

const insertAsset = (type, symbol, exchange, name) => {
  const query = `insert into Assets (type, symbol, exchange, name) values (?, ?, ?, ?)`;

  connection.query(query, [type, symbol, exchange, name], (err, result) => {
    if (err) {
      console.log(err);
      return;
    }
    console.log('data inserted: ', result);
  });
};

connection.end();
