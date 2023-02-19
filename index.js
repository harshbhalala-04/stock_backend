const { default: axios } = require("axios");
const express = require("express");
const firebase = require('firebase');
const app = express();
const port = process.env.PORT || 8000;
const cors = require('cors');
app.use(cors({
    origin: "*", // use your actual domain name (or localhost), using * is not recommended
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Origin', 'X-Requested-With', 'Accept', 'x-client-key', 'x-client-token', 'x-client-secret', 'Authorization'],
    credentials: true
}))

const firebaseConfig = {
  apiKey: "AIzaSyBFxKD78rgmwaiyP6vaPJ2QvWp0Hpv--_k",
  authDomain: "stock-backend-2da5a.firebaseapp.com",
  projectId: "stock-backend-2da5a",
  storageBucket: "stock-backend-2da5a.appspot.com",
  messagingSenderId: "343993585745",
  appId: "1:343993585745:web:dbaa6540e76d62db026870",
  measurementId: "G-GSGZ4DJ48M"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();


app.get("/long-hold", (req, res) => {
  console.log(req.query)
  const closingList = [];
  const dateList = [];

  axios.get(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${req.query.symbol}&outputsize=full&apikey=PC7NYSVUMGVGRVXH`).then(function (respose) {
    const finalRes = respose.data["Time Series (Daily)"];

    for (key in finalRes) {
      if (new Date(key) >= new Date(req.query.startDate.toString()) && new Date(key) <= new Date(req.query.endDate.toString())) {
        dateList.push(key)
        closingList.push(finalRes[key]['5. adjusted close']);
      }
    }

    const returnList = [];
    let baseIndex = 100;
    const indexList = [100];
    const finalDates = [];
    for (let i = closingList.length - 2; i >= 0; i--) {
      let returnVal = ((closingList[i] - closingList[i + 1]) / closingList[i + 1]) * 100;
      returnVal = Number(returnVal.toFixed(3))
      returnList.push(returnVal);
      baseIndex = baseIndex * (1 + (returnVal / 100));
      indexList.push(Number(baseIndex.toFixed(3)));
      finalDates.push(dateList[i + 1])
    }
    finalDates.push(dateList[0])
    res.send({ "returnList": returnList, "indexList": indexList, "finalDates": finalDates })

  }).catch(function (error) { console.log(error) })
})

app.get("/long-intraday", (req, res) => {


  let openList = [];
  let closingList = [];
  const dateList = [];
  axios.get(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${req.query.symbol}&outputsize=full&apikey=PC7NYSVUMGVGRVXH`).then(function (respose) {
    const finalRes = respose.data["Time Series (Daily)"];

    for (key in finalRes) {
      if (new Date(key) >= new Date(req.query.startDate.toString()) && new Date(key) <= new Date(req.query.endDate.toString())) {
        dateList.push(key)
        openList.push(parseFloat(finalRes[key]['1. open']));
        closingList.push(parseFloat(finalRes[key]['5. adjusted close']));
      }
    }
    openList = openList.reverse();
    closingList = closingList.reverse();
    const finalDates = [];

    for (let i = dateList.length - 1; i >= 0; i--) {
      finalDates.push(dateList[i]);
    }

    const buyValueList = [];
    const sellValueList = [];
    const buyTurnoverList = [];
    const sellTurnOverList = [];
    const pnlList = [];
    const tradingCostList = [];
    const pacList = [];
    const cashAccountBaseList = [];
    const shortFallList = [];
    let cashAccountExShortFallList = [];
    const quantity = parseFloat(Number(Math.floor(100000 / openList[0])).toFixed(3));
    console.log(quantity)
    for (let i = 0; i < closingList.length; i++) {
      const buyVal = parseFloat(Number(openList[i] * quantity).toFixed(3));
      const sellVal = parseFloat(Number(closingList[i] * quantity).toFixed(3));
      buyValueList.push(buyVal);
      sellValueList.push(sellVal);
      const buyTurnOverVal = parseFloat(Number(buyVal * 4).toFixed(3));
      const sellTurnOverVal = parseFloat(Number(sellVal * 4).toFixed(3));
      buyTurnoverList.push(buyTurnOverVal);
      sellTurnOverList.push(sellTurnOverVal);
      const pnlVal = parseFloat(Number((sellTurnOverVal) - (buyTurnOverVal)).toFixed(3));
      pnlList.push(pnlVal);
      const buyBrokerage = buyTurnOverVal * 0.0003 > 20 ? 20 : parseFloat(Number(buyTurnOverVal * 0.0003).toFixed(3));
      const sellBrokerage = sellTurnOverVal * 0.0003 > 20 ? 20 : parseFloat(Number(sellTurnOverVal * 0.0003).toFixed(3));
      const buyTransaction = parseFloat(Number(buyTurnOverVal * 0.0000345).toFixed(3));
      const sellTransaction = parseFloat(Number(sellTurnOverVal * 0.0000345).toFixed(3));
      const buySEBIVal = parseFloat(Number(buyTurnOverVal * 0.000001 * 1.18).toFixed(3));
      const sellSEBIVal = parseFloat(Number(sellTurnOverVal * 0.000001 * 1.18).toFixed(3));
      const buyGSTVal = parseFloat(Number((buyBrokerage + buyTransaction) * 0.18).toFixed(3));
      const sellGSTVal = parseFloat(Number((sellBrokerage + sellTransaction) * 0.18).toFixed(3));
      const sellSSTVal = parseFloat(Number(sellTurnOverVal * 0.00025).toFixed(3));
      const buyStampDutyVal = parseFloat(Number(buyTurnOverVal * 0.00003).toFixed(3));
      const tradingCostVal = parseFloat(Number(parseFloat(buyBrokerage) + parseFloat(sellBrokerage) + parseFloat(buyTransaction) + parseFloat(sellTransaction) + parseFloat(buySEBIVal) + parseFloat(sellSEBIVal) + parseFloat(buyGSTVal) + parseFloat(sellGSTVal) + parseFloat(sellSSTVal) + parseFloat(buyStampDutyVal)).toFixed(3));
      tradingCostList.push(tradingCostVal);
      const pacVal = parseFloat(Number(pnlVal - tradingCostVal).toFixed(3));
      pacList.push(pacVal);
      let cashAccountBaseVal;
      if (i == 0) {
        cashAccountBaseVal = parseFloat(Number(openList[i] * quantity).toFixed(3));
        cashAccountBaseList.push(cashAccountBaseVal);
        shortFallList.push(parseFloat(Number(cashAccountBaseVal - (openList[i] * quantity)).toFixed(3)))

      } else {
        const prevCashAccountBaseVal = cashAccountBaseList[cashAccountBaseList.length - 1];
        cashAccountBaseVal = parseFloat(pacVal + prevCashAccountBaseVal);
        cashAccountBaseList.push(parseFloat(Number(cashAccountBaseVal).toFixed(3)))
        shortFallList.push(parseFloat(Number(cashAccountBaseVal - (openList[i] * quantity)).toFixed(3)))
      }
    }


    const minShortFallVal = Math.min(...shortFallList);

    if (minShortFallVal < 0) {
      for (let i = 0; i < cashAccountBaseList.length; i++) {
        cashAccountExShortFallList.push(parseFloat(Number(cashAccountBaseList[i] - minShortFallVal).toFixed(3)));
      }
    } else {
      cashAccountExShortFallList = [...cashAccountBaseList];
    }



    const returnList = [];
    let baseIndex = 100;
    const indexList = [100];

    for (let i = 1; i < cashAccountExShortFallList.length; i++) {
      const returnVal = ((cashAccountExShortFallList[i] - cashAccountExShortFallList[i - 1]) / cashAccountExShortFallList[i - 1]) * 100;
      baseIndex = baseIndex * (1 + (returnVal / 100))
      indexList.push(parseFloat(Number(baseIndex).toFixed(3)));
    }

    res.send({ "indexList": indexList, "finalDates": finalDates })

  }).catch(function (error) { console.log(error) })
})

app.listen(port, () => {
  console.log("Server running on ", port);
})

/*
3330.2
3300
3229
3285
3290.1
3329
3342.9
3317
3330
3380
3380
3365
3388
3425
3425.3
3426
3420
3449
3363
3427
3504
3473.15
3468.9
3478.05
3515
3520

close:
3311.1
3211.55
3254.03
3221.15
3262.61
3268.15
3307.55
3334.05
3378.4
3390
3373.1
3363.1
3414.9
3436.3
3429.75
3411.05
3433.65
3358.7
3408.35
3460.4
3482.3
3459.95
3472.55
3520.1
3540.85
3537.55

*/