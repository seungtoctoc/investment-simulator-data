import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

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
