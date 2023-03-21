const { default: axios } = require("axios");
const express = require("express");
const firebase = require("firebase");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Stock = require("./models/stock");
const app = express();
const port = process.env.PORT || 8000;
const cors = require("cors");
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());
const dbUrl =
  "mongodb+srv://HarshBhalala:0DxNFACJ2RLdf6RX@my-cluster.7idmb.mongodb.net/stockDB?retryWrites=true&w=majority";

const connectionParams = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

mongoose
  .connect(dbUrl, connectionParams)
  .then(() => {
    console.log("connected");
  })
  .catch((e) => {
    console.log("error " + e);
  });

const calculateLongHold = (finalRes, startDate, endDate) => {
  const closingList = [];
  const dateList = [];
  const returnList = [];
  for (let i = 0; i < finalRes.length; i++) {
    if (
      finalRes[i].date >= new Date(startDate) &&
      finalRes[i].date <= new Date(endDate)
    ) {
      const formatedDate = new Date(finalRes[i].date)
        .toISOString()
        .split("T")[0];
      dateList.push(formatedDate);
      returnList.push(finalRes[i].returnVal);
    }
  }

  let baseIndex = 100;
  const indexList = [100];
  const finalDates = [];
  for (let i = 1; i < dateList.length; i++) {
    // let returnVal =
    //   ((closingList[i] - closingList[i + 1]) / closingList[i + 1]) * 100;
    // returnVal = Number(returnVal.toFixed(3));
    // returnList.push(returnVal);
    baseIndex = baseIndex * (1 + returnList[i] / 100);
    indexList.push(Number(baseIndex.toFixed(3)));
    // finalDates.push(dateList[i]);
  }
  // finalDates.push(dateList[0]);
  return { indexList: indexList, finalDates: dateList };
};

app.get("/long-hold", async (req, res) => {
  const selectedLastDate = new Date(req.query.endDate);
  const stock = await Stock.findOne({
    name: { $eq: req.query.symbol },
    updatedAt: { $gte: selectedLastDate },
  });
  if (stock == null) {
    axios
      .get(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${req.query.symbol}&outputsize=full&apikey=PC7NYSVUMGVGRVXH`
      )
      .then(function (respose) {
        console.log("Req body empty");
        const closingList = [];
        const dateList = [];
        const finalRes = respose.data["Time Series (Daily)"];
        for (key in finalRes) {
          {
            dateList.push(key);
            closingList.push(finalRes[key]["5. adjusted close"]);
          }
        }
        const returnList = [];
        const finalDates = [];
        for (let i = closingList.length - 2; i >= 0; i--) {
          let returnVal =
            ((closingList[i] - closingList[i + 1]) / closingList[i + 1]) * 100;
          returnVal = Number(returnVal.toFixed(3));
          returnList.push(returnVal);
          finalDates.push(dateList[i + 1]);
        }
        finalDates.push(dateList[0]);
        const returnValToDateMap = [];
        for (let i = 0; i < finalDates.length; i++) {
          if (i == 0) {
            returnValToDateMap.push({
              date: finalDates[i],
              returnVal: 0,
            });
          } else {
            returnValToDateMap.push({
              date: finalDates[i],
              returnVal: returnList[i -1],
            });
          }
        }
        console.log(finalDates.length);
        console.log(returnList.length);
        try {
          const name = req.query.symbol;
          const lastDate = finalDates[finalDates.length - 1];
          const returnList = returnValToDateMap;
          const stock = new Stock({ name, returnList, lastDate });
          stock.save();
          res.send(
            calculateLongHold(
              stock.returnList,
              req.query.startDate.toString(),
              req.query.endDate.toString()
            )
          );
        } catch (err) {
          console.error(err);
          res.status(500).send("Server error");
        }
      })
      .catch(function (error) {
        console.log("catch block");
        console.log(error);
      });
  } else {
    res.send(
      calculateLongHold(
        stock.returnList,
        req.query.startDate.toString(),
        req.query.endDate.toString()
      )
    );
  }
  // if (Object.keys(finalRes).length === 0) {

  // } else {
  //   console.log("Req body contains val");
  //   res.send(
  //     calculateLongHold(
  //       finalRes,
  //       req.query.startDate.toString(),
  //       req.query.endDate.toString()
  //     )
  //   );
  // }
});

app.get("/long-intraday", (req, res) => {
  let openList = [];
  let closingList = [];
  const dateList = [];
  axios
    .get(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${req.query.symbol}&outputsize=full&apikey=PC7NYSVUMGVGRVXH`
    )
    .then(function (respose) {
      const finalRes = respose.data["Time Series (Daily)"];

      for (key in finalRes) {
        // if (
        //   new Date(key) >= new Date(req.query.startDate.toString()) &&
        //   new Date(key) <= new Date(req.query.endDate.toString())
        // ) {
        dateList.push(key);
        openList.push(parseFloat(finalRes[key]["1. open"]));
        closingList.push(parseFloat(finalRes[key]["5. adjusted close"]));
        // }
      }
      openList = openList.reverse();
      closingList = closingList.reverse();
      const finalDates = [];

      try {
        const name = req.query.symbol;
        const open = openList;
        const close = closingList;
        const stock = new Stock({ name, open, close });
        console.log(stock.open);
        console.log(stock.close);
        stock.save();
      } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
      }

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
      const quantity = parseFloat(
        Number(Math.floor(100000 / openList[0])).toFixed(3)
      );
      console.log(quantity);
      for (let i = 0; i < closingList.length; i++) {
        const buyVal = parseFloat(Number(openList[i] * quantity).toFixed(3));
        const sellVal = parseFloat(
          Number(closingList[i] * quantity).toFixed(3)
        );
        buyValueList.push(buyVal);
        sellValueList.push(sellVal);
        const buyTurnOverVal = parseFloat(Number(buyVal * 4).toFixed(3));
        const sellTurnOverVal = parseFloat(Number(sellVal * 4).toFixed(3));
        buyTurnoverList.push(buyTurnOverVal);
        sellTurnOverList.push(sellTurnOverVal);
        const pnlVal = parseFloat(
          Number(sellTurnOverVal - buyTurnOverVal).toFixed(3)
        );
        pnlList.push(pnlVal);
        const buyBrokerage =
          buyTurnOverVal * 0.0003 > 20
            ? 20
            : parseFloat(Number(buyTurnOverVal * 0.0003).toFixed(3));
        const sellBrokerage =
          sellTurnOverVal * 0.0003 > 20
            ? 20
            : parseFloat(Number(sellTurnOverVal * 0.0003).toFixed(3));
        const buyTransaction = parseFloat(
          Number(buyTurnOverVal * 0.0000345).toFixed(3)
        );
        const sellTransaction = parseFloat(
          Number(sellTurnOverVal * 0.0000345).toFixed(3)
        );
        const buySEBIVal = parseFloat(
          Number(buyTurnOverVal * 0.000001 * 1.18).toFixed(3)
        );
        const sellSEBIVal = parseFloat(
          Number(sellTurnOverVal * 0.000001 * 1.18).toFixed(3)
        );
        const buyGSTVal = parseFloat(
          Number((buyBrokerage + buyTransaction) * 0.18).toFixed(3)
        );
        const sellGSTVal = parseFloat(
          Number((sellBrokerage + sellTransaction) * 0.18).toFixed(3)
        );
        const sellSSTVal = parseFloat(
          Number(sellTurnOverVal * 0.00025).toFixed(3)
        );
        const buyStampDutyVal = parseFloat(
          Number(buyTurnOverVal * 0.00003).toFixed(3)
        );
        const tradingCostVal = parseFloat(
          Number(
            parseFloat(buyBrokerage) +
              parseFloat(sellBrokerage) +
              parseFloat(buyTransaction) +
              parseFloat(sellTransaction) +
              parseFloat(buySEBIVal) +
              parseFloat(sellSEBIVal) +
              parseFloat(buyGSTVal) +
              parseFloat(sellGSTVal) +
              parseFloat(sellSSTVal) +
              parseFloat(buyStampDutyVal)
          ).toFixed(3)
        );
        tradingCostList.push(tradingCostVal);
        const pacVal = parseFloat(Number(pnlVal - tradingCostVal).toFixed(3));
        pacList.push(pacVal);
        let cashAccountBaseVal;
        if (i == 0) {
          cashAccountBaseVal = parseFloat(
            Number(openList[i] * quantity).toFixed(3)
          );
          cashAccountBaseList.push(cashAccountBaseVal);
          shortFallList.push(
            parseFloat(
              Number(cashAccountBaseVal - openList[i] * quantity).toFixed(3)
            )
          );
        } else {
          const prevCashAccountBaseVal =
            cashAccountBaseList[cashAccountBaseList.length - 1];
          cashAccountBaseVal = parseFloat(pacVal + prevCashAccountBaseVal);
          cashAccountBaseList.push(
            parseFloat(Number(cashAccountBaseVal).toFixed(3))
          );
          shortFallList.push(
            parseFloat(
              Number(cashAccountBaseVal - openList[i] * quantity).toFixed(3)
            )
          );
        }
      }

      const minShortFallVal = Math.min(...shortFallList);

      if (minShortFallVal < 0) {
        for (let i = 0; i < cashAccountBaseList.length; i++) {
          cashAccountExShortFallList.push(
            parseFloat(
              Number(cashAccountBaseList[i] - minShortFallVal).toFixed(3)
            )
          );
        }
      } else {
        cashAccountExShortFallList = [...cashAccountBaseList];
      }

      const returnList = [];
      let baseIndex = 100;
      const indexList = [100];

      for (let i = 1; i < cashAccountExShortFallList.length; i++) {
        const returnVal =
          ((cashAccountExShortFallList[i] - cashAccountExShortFallList[i - 1]) /
            cashAccountExShortFallList[i - 1]) *
          100;
        baseIndex = baseIndex * (1 + returnVal / 100);
        indexList.push(parseFloat(Number(baseIndex).toFixed(3)));
      }

      res.send({ indexList: indexList, finalDates: finalDates });
    })
    .catch(function (error) {
      console.log(error);
    });
});

app.listen(port, () => {
  console.log("Server running on ", port);
});
