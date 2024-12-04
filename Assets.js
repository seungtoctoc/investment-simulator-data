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
      marketCap: stock.marketCap,
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
          stock.exchangeShortName === 'KOE' ||
          stock.exchangeShortName === 'AMEX'
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

const insertAsset = (type, symbol, exchange, name, marketCap) => {
  return new Promise((resolve, reject) => {
    const query = `insert into assets (type, symbol, exchange, name, market_cap) values (?, ?, ?, ?, ?)`;

    connection.query(
      query,
      [type, symbol, exchange, name, marketCap],
      (err, result) => {
        if (err) {
          console.log(err);
          reject(err);
        }
        console.log('data inserted: ', result);
        resolve();
      }
    );
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

const updateKoreanName = (symbol, korean_name) => {
  return new Promise((resolve, reject) => {
    const query = `update assets set korean_name = ? where symbol = ?`;

    connection.query(query, [korean_name, symbol], (err, result) => {
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
    if (!asset.name || !asset.symbol || !asset.marketCap) {
      continue;
    }

    const name =
      asset.name.length > 120 ? asset.name.slice(0, 120) : asset.name;

    console.log('save: ', type, asset.symbol, exchange, name, asset.marketCap);
    await insertAsset(type, asset.symbol, exchange, name, asset.marketCap);
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

const getAllAssets = () => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM assets';

    connection.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching data:', err);
        reject(err);
        return;
      }

      fs.writeFileSync(`results/assets.json`, JSON.stringify(results, null, 2));
      resolve(results);
    });
  });
};

const getForexesList = async (exchange) => {
  try {
    const endpoint = `https://financialmodelingprep.com/api/v3/symbol/available-forex-currency-pairs?apikey=${process.env.FMP_API_KEY}`;
    const resp = await axios.get(endpoint);

    const filteredStocks = resp.data
      .filter(
        (stock) => stock.name.includes('KRW') && stock.name.includes('USD')
      )
      .map((stock) => ({
        symbol: stock.symbol,
        name: stock.name,
        marketCap: 0,
      }));

    fs.writeFileSync(
      `results/Forex.json`,
      JSON.stringify(filteredStocks, null, 2)
    );
  } catch (err) {
    console.log(err);
  }
};

const insertForexToAssets = async (file) => {
  const assetsToInsert = JSON.parse(fs.readFileSync(file, 'utf8'));

  for (const asset of assetsToInsert) {
    if (!asset.name) {
      continue;
    }

    console.log('save: ', asset.symbol);
    await insertAsset('forex', asset.symbol, 'FOREX', asset.name, 0);
  }
};

const updateKoreanNames = async (file) => {
  const assets = JSON.parse(fs.readFileSync(file, 'utf8'));

  const endpoint =
    'https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/search-info';

  const headers = {
    'content-type': 'application/json; charset=utf-8',
    authorization: `${process.env.KIS_ACCESS_TOKEN}`,
    appkey: `${process.env.KIS_APP_KEY}`,
    appsecret: `${process.env.KIS_APP_SECRET}`,
    tr_id: 'CTPF1604R',
    custtype: 'P',
  };

  const typeCode = new Map([
    ['KOSPI', 300],
    ['KOSDAQ', 300],
    ['NASDAQ', 512],
    ['NYSE', 513],
    ['AMEX', 529],
  ]);

  for (const asset of assets) {
    // const symbol = asset.exchange.startsWith('K')
    //   ? asset.symbol.slice(0, -3)
    //   : asset.symbol;

    const params = `?PDNO=${asset.symbol}&PRDT_TYPE_CD=${typeCode.get('AMEX')}`;

    try {
      const resp = await axios(endpoint + params, { headers });

      if (!resp) {
        continue;
      }

      const koreanName =
        resp.data.output.prdt_name120.length > 100
          ? resp.data.output.prdt_name120.slice(0, 100)
          : resp.data.output.prdt_name120;

      await updateKoreanName(asset.symbol, koreanName);
      console.log('updated ', asset.symbol, koreanName);
    } catch (err) {
      console.log('error', asset.symbol);
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

// getStocksOfExchange('KOE');
// getStocksOfExchange('KSC');
// getStocksOfExchange('NASDAQ');
// getStocksOfExchange('NYSE');
// getStocksOfExchange('AMEX');
// getForexesList();

// await insertFileToAssets('results/stocksOfKOE.json', 'stock', 'KOSDAQ');
// await insertFileToAssets('results/stocksOfKSC.json', 'stock', 'KOSPI');
// await insertFileToAssets('results/stocksOfNASDAQ.json', 'stock', 'NASDAQ');
// await insertFileToAssets('results/stocksOfNYSE.json', 'stock', 'NYSE');
// await getETF();
// await updateEtfType('results/ETF.json');
// await insertForexToAssets('results/Forex.json');

// await insertFileToAssets('results/stocksOfAMEX.json', 'stock', 'AMEX');

await getAllAssets();

// await updateKoreanNames('results/stocksOfAMEX.json');

connection.end();
