const axios = require("axios");

const BASE_URL = "https://api.exchangerate.host/latest";

async function convertFromUSD(amount, targetCurrency) {
  if (targetCurrency === "USD") {
    return amount;
  }

  const response = await axios.get(BASE_URL, {
    params: {
      base: "USD",
      symbols: targetCurrency,
    },
  });

  const rate = response.data.rates[targetCurrency];
  return amount * rate;
}

module.exports = { convertFromUSD };
