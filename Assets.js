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
  return new Promise((resolve, reject) => {
    const query = `insert into assets (type, symbol, exchange, name) values (?, ?, ?, ?)`;

    connection.query(query, [type, symbol, exchange, name], (err, result) => {
      if (err) {
        console.log(err);
        reject(err);
      }
      console.log('data inserted: ', result);
      resolve();
    });
  });
};

const updateType = (type, symbol) => {
  return new Promise((resolve, reject) => {
    const query = `update assets set type = ? where symbol = ?`;

    connection.query(query, [type, symbol], (err, result) => {
      if (err) {
        console.log(err);
        reject(err);
      }
      console.log('data updated: ', result);
      resolve();
    });
  });
};

const insertFileToAssets = async (file, type, exchange) => {
  const assetsToInsert = JSON.parse(fs.readFileSync(file, 'utf8'));

  for (const asset of assetsToInsert) {
    if (!asset.name) {
      continue;
    }

    const name =
      asset.name.length > 100 ? asset.name.slice(0, 100) : asset.name;

    console.log('save: ', type, asset.symbol, exchange, name);
    await insertAsset(type, asset.symbol, exchange, name);
  }
};

const getFormattedExchange = (exchange) => {
  if (exchange === 'KSC') {
    return 'KOSPI';
  }

  if (exchange === 'KOE') {
    return 'KOSDAQ';
  }

  return exchange;
};

const updateEtfType = async (file) => {
  const assetsToInsert = JSON.parse(fs.readFileSync(file, 'utf8'));

  for (const asset of assetsToInsert) {
    if (!asset.name) {
      continue;
    }

    console.log('update: ', 'etf', asset.symbol);
    await updateType('etf', asset.symbol);
  }
};

// await insertFileToAssets('results/stocksOfKOE.json', 'stock', 'KOSDAQ');
// await insertFileToAssets('results/stocksOfKSC.json', 'stock', 'KOSPI');
// await insertFileToAssets('results/stocksOfNASDAQ.json', 'stock', 'NASDAQ');
// await insertFileToAssets('results/stocksOfNYSE.json', 'stock', 'NYSE');
// await updateEtfType('results/ETF.json');
connection.end();
