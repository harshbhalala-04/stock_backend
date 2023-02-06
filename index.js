const { default: axios } = require("axios");
const express = require("express");
const yahooFinance = require('yahoo-finance');
const app = express();
const port = process.env.PORT || 8000;



app.get("/", (req, res) => {
  console.log(req.query)
  const closingList = [];

  axios.get(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${req.query.symbol}&outputsize=full&apikey=PC7NYSVUMGVGRVXH`).then(function (respose) {
    console.log("Response")
    const finalRes = respose.data["Time Series (Daily)"];
    for (key in finalRes) {
      if (new Date(key) >= new Date(req.query.startDate.toString()) && new Date(key) <= new Date(req.query.endDate.toString())) {
        console.log(finalRes[key])
        closingList.push(finalRes[key]['5. adjusted close']);
      }
    }

    const returnList = [];
    let baseIndex = 100;
    const indexList = [100];
    for (let i = closingList.length - 2; i >= 0; i--) {
      let returnVal = ((closingList[i] - closingList[i + 1]) / closingList[i + 1]) * 100;
      returnVal = Number(returnVal.toFixed(3))
      returnList.push(returnVal);
      baseIndex = baseIndex * (1 + (returnVal / 100));
      indexList.push(Number(baseIndex.toFixed(3)));
    }
    res.send({ "returnList": returnList, "indexList": indexList })

  }).catch(function (error) { console.log(error) })
})

app.listen(port, () => {
  console.log("Server running on ", port);
})