import axios from "axios";
import Stock from "../models/stock.js";
import { infyData, aaplData, ixicData } from "../constants/data.js";
function getDayName(date = new Date(), locale = 'en-US') {
  return date.toLocaleDateString(locale, { weekday: 'long' });
}

let dayWiseGreenRedCountMap = {};
let dayWiseGapUpGapDownCountMap = {};
let dayWiseGreenRedMagnitudeMap = {};
let dayWiseGapMagnitudeMap = {};
let eventProbability = {};
let conditionalProbability = {};

function getNewGreenRedDayList(dateList, candleList, greenDayList, redDayList, gapList, gapUpList, gapDownList) {
  dayWiseGreenRedCountMap = {
    "Monday": { "greenDayCount": 0, "redDayCount": 0 },
    "Tuesday": { "greenDayCount": 0, "redDayCount": 0 },
    "Wednesday": { "greenDayCount": 0, "redDayCount": 0 },
    "Thursday": { "greenDayCount": 0, "redDayCount": 0 },
    "Friday": { "greenDayCount": 0, "redDayCount": 0 },
  };
  dayWiseGapUpGapDownCountMap = {
    "Monday": { "gapUpCount": 0, "gapDownCount": 0 },
    "Tuesday": { "gapUpCount": 0, "gapDownCount": 0 },
    "Wednesday": { "gapUpCount": 0, "gapDownCount": 0 },
    "Thursday": { "gapUpCount": 0, "gapDownCount": 0 },
    "Friday": { "gapUpCount": 0, "gapDownCount": 0 },
  };
  dayWiseGreenRedMagnitudeMap = {
    "Monday": { "greenMagnitude": 0, "redMagnitude": 0 },
    "Tuesday": { "greenMagnitude": 0, "redMagnitude": 0 },
    "Wednesday": { "greenMagnitude": 0, "redMagnitude": 0 },
    "Thursday": { "greenMagnitude": 0, "redMagnitude": 0 },
    "Friday": { "greenMagnitude": 0, "redMagnitude": 0 },
  };
  dayWiseGapMagnitudeMap = {
    "Monday": { "gapUpMagnitude": 0, "gapDownMagnitude": 0 },
    "Tuesday": { "gapUpMagnitude": 0, "gapDownMagnitude": 0 },
    "Wednesday": { "gapUpMagnitude": 0, "gapDownMagnitude": 0 },
    "Thursday": { "gapUpMagnitude": 0, "gapDownMagnitude": 0 },
    "Friday": { "gapUpMagnitude": 0, "gapDownMagnitude": 0 },
  };
  eventProbability = {
    "gapUpGreen": 0,
    "gapUpRed": 0,
    "gapDownGreen": 0,
    "gapDownRed": 0
  };
  conditionalProbability = {
    "gapUpGreen": 0,
    "gapUpRed": 0,
    "gapDownGreen": 0,
    "gapDownRed": 0
  };
  let newStats = [];
  let gapUpCount = 0;
  let gapDownCount = 0;
  for (let i = 0; i < dateList.length; i++) {
    const dayName = getDayName(new Date(dateList[i]));
    if (dayName in dayWiseGreenRedCountMap) {
      if (greenDayList[i] === 1) {
        dayWiseGreenRedCountMap[dayName]['greenDayCount'] += 1;
        dayWiseGreenRedMagnitudeMap[dayName]['greenMagnitude'] = parseFloat(Number(parseFloat(Number(dayWiseGreenRedMagnitudeMap[dayName]['greenMagnitude']).toFixed(2)) + parseFloat(Number(candleList[i]).toFixed(2))).toFixed(2));
      } else {
        dayWiseGreenRedCountMap[dayName]['redDayCount'] += 1;
        let candleValue = Math.abs(candleList[i]);
        dayWiseGreenRedMagnitudeMap[dayName]['redMagnitude'] = parseFloat(Number(parseFloat(Number(dayWiseGreenRedMagnitudeMap[dayName]['redMagnitude']).toFixed(2)) + parseFloat(Number(candleValue).toFixed(2))).toFixed(2));
      }
      if (i !== 0) {
        if (gapList[i] >= 0) {
          gapUpCount++;
          dayWiseGapUpGapDownCountMap[dayName]['gapUpCount'] += 1;
          dayWiseGapMagnitudeMap[dayName]['gapUpMagnitude'] = parseFloat(Number(parseFloat(Number(dayWiseGapMagnitudeMap[dayName]['gapUpMagnitude']).toFixed(2)) + parseFloat(Number(gapList[i]).toFixed(2))).toFixed(2));
        } else {
          gapDownCount++;
          dayWiseGapUpGapDownCountMap[dayName]['gapDownCount'] += 1;
          let gapValue = Math.abs(gapList[i]);
          dayWiseGapMagnitudeMap[dayName]['gapDownMagnitude'] = parseFloat(Number(parseFloat(Number(dayWiseGapMagnitudeMap[dayName]['gapDownMagnitude']).toFixed(2)) + parseFloat(Number(gapValue).toFixed(2))).toFixed(2));
        }
        if (gapUpList[i] === 1 && greenDayList[i] === 1) {
          eventProbability["gapUpGreen"] += 1;
        } else if (gapUpList[i] === 1 && redDayList[i] === 1) {
          eventProbability["gapUpRed"] += 1;
        } else if (gapDownList[i] === 1 && greenDayList[i] === 1) {
          eventProbability["gapDownGreen"] += 1;
        } else if (gapDownList[i] === 1 && redDayList[i] === 1) {
          eventProbability["gapDownRed"] += 1;
        }
      }
      newStats.push({
        "date": typeof dateList[i] === "string" ? dateList[i] : dateList[i].toISOString().substring(0, 10),
        "greenDay": greenDayList[i],
        "redDay": redDayList[i],
        "candle": candleList[i],
        "gaps": gapList[i],
        "gapUp": gapUpList[i],
        "gapDown": gapDownList[i]
      });
    }
  }
  conditionalProbability["gapUpGreen"] = Number(((eventProbability["gapUpGreen"] / gapUpCount) * 100).toFixed(2));
  conditionalProbability["gapUpRed"] = Number(((eventProbability["gapUpRed"] / gapUpCount) * 100).toFixed(2));
  conditionalProbability["gapDownGreen"] = Number(((eventProbability["gapDownGreen"] / gapDownCount) * 100).toFixed(2));
  conditionalProbability["gapDownRed"] = Number(((eventProbability["gapDownRed"] / gapDownCount) * 100).toFixed(2));
  eventProbability["gapUpGreen"] = Number(((eventProbability["gapUpGreen"] / (gapUpCount + gapDownCount)) * 100).toFixed(2));
  eventProbability["gapUpRed"] = Number(((eventProbability["gapUpRed"] / (gapUpCount + gapDownCount)) * 100).toFixed(2));
  eventProbability["gapDownGreen"] = Number(((eventProbability["gapDownGreen"] / (gapUpCount + gapDownCount)) * 100).toFixed(2));
  eventProbability["gapDownRed"] = Number(((eventProbability["gapDownRed"] / (gapUpCount + gapDownCount)) * 100).toFixed(2));
  return newStats;
}

async function getDayWiseGreenRedDayCount(finalRes, stock, selectedStartDate, selectedEndDate, stockFound) {
  let dateList = [];
  let candleList = [];
  let greenDayList = [];
  let gapUpList = [];
  let gapDownList = [];
  let redDayList = [];
  let gapList = [];
  const openList = [];
  const closeList = [];
  for (const key in finalRes) {
    const closeValue = parseFloat(Number(finalRes[key]["close"]).toFixed(2));
    const openValue = parseFloat(Number(finalRes[key]["open"]).toFixed(2));
    openList.push(openValue);
    closeList.push(closeValue);
    const candleValue = closeValue - openValue;
    candleList.push(parseFloat(Number(candleValue).toFixed(2)));
    if (candleValue >= 0) {
      greenDayList.push(1);
      redDayList.push(0);
    } else {
      redDayList.push(1);
      greenDayList.push(0);
    }
    dateList.push(finalRes[key]['datetime']);
  }
  dateList = dateList.reverse();
  greenDayList = greenDayList.reverse();
  redDayList = redDayList.reverse();
  candleList = candleList.reverse();
  gapList = gapList.reverse();
  gapUpList = gapUpList.reverse();
  gapDownList = gapDownList.reverse();
  const newDateList = [];
  const newGreenDayList = [];
  const newRedDayList = [];
  const newCandleList = [];
  const newGapList = [];
  const newGapUpList = [];
  const newGapDownList = [];
  for (let i = 0; i < dateList.length; i++) {
    if (i !== 0) {
      let gap = openList[i] - closeList[i - 1];
      gapList.push(parseFloat(Number(gap).toFixed(2)));
      if (gap >= 0) {
        gapUpList.push(1);
        gapDownList.push(0);
      } else {
        gapUpList.push(0);
        gapDownList.push(1);
      }
    } else {
      gapList.push(0);
      gapUpList.push(0);
      gapDownList.push(0);
    }
    if (new Date(dateList[i]) >= new Date(selectedStartDate) && new Date(dateList[i]) <= new Date(selectedEndDate)) {
      newDateList.push(dateList[i]);
      newGreenDayList.push(greenDayList[i]);
      newRedDayList.push(redDayList[i]);
      newCandleList.push(candleList[i]);
      newGapList.push(gapList[i]);
      newGapUpList.push(gapUpList[i]);
      newGapDownList.push(gapDownList[i]);
    }
  }
  console.log(stock);
  if (stockFound) {
    console.log(stock);
    stock.statsList = getNewGreenRedDayList(dateList, candleList, greenDayList, redDayList, gapList, gapUpList, gapDownList);
    try {
      stock.save();
    } catch (e) {
      console.log(e);
    }
  }
  getNewGreenRedDayList(newDateList, newCandleList, newGreenDayList, newRedDayList, newGapList, newGapUpList, newGapDownList);
}

function calculateGreenRedDayCount(statsList, selectedStartDate, selectedEndDate) {
  let dateList = [];
  let greenDayList = [];
  let redDayList = [];
  let candleList = [];
  let gapList = [];
  let gapUpList = [];
  let gapDownList = [];
  for (let i = 0; i < statsList.length; i++) {
    if (statsList[i].date >= new Date(selectedStartDate) && statsList[i].date <= new Date(selectedEndDate)) {
      dateList.push(statsList[i].date);
      greenDayList.push(statsList[i].greenDay);
      redDayList.push(statsList[i].redDay);
      candleList.push(statsList[i].candle);
      gapList.push(statsList[i].gaps);
      gapUpList.push(statsList[i].gapUp);
      gapDownList.push(statsList[i].gapDown);
    }
  }
  getNewGreenRedDayList(dateList, candleList, greenDayList, redDayList, gapList, gapUpList, gapDownList);
}

export const calculateStats = async (req, res) => {
  const selectedSymbol = req.query.ticker;
  let selectedEndDate = new Date(req.query.endDate);
  selectedEndDate.setUTCHours(0, 0, 0, 0);
  let selectedStartDate = new Date(req.query.startDate);
  selectedStartDate.setUTCHours(0, 0, 0, 0);
  selectedEndDate = selectedEndDate.toISOString();
  selectedStartDate = selectedStartDate.toISOString();
  const isCustom = req.query.isCustom;
  const stockFindByRequestedDate = await Stock.findOne({
    name: {
      $eq: req.query.ticker
    },
    requestedStartDate: {
      $lte: selectedStartDate
    },
    requestedEndDate: {
      $gte: selectedEndDate
    }
  });
  const stockFindByActualDate = await Stock.findOne({
    name: {
      $eq: req.query.ticker
    },
    startDate: {
      $lte: selectedStartDate
    },
    endDate: {
      $gte: selectedEndDate
    }
  });
  let finalStock;
  if (stockFindByRequestedDate !== null) {
    finalStock = stockFindByRequestedDate;
  } else {
    finalStock = stockFindByActualDate;
  }
  let finalRes = {};
  let stockFound = false;
  if (finalStock !== null) {
    stockFound = true;
  }
  if (finalStock === null || finalStock.statsList === null || finalStock.statsList.length === 0) {
    selectedEndDate = new Date(selectedEndDate);
    selectedStartDate = new Date(selectedStartDate);
    if (!(isCustom === "true" && selectedStartDate.getFullYear() < selectedEndDate.getFullYear() - 10)) {
      selectedStartDate = selectedStartDate.setFullYear(selectedEndDate.getFullYear() - 10);
      selectedStartDate = new Date(selectedStartDate);
    }
    selectedStartDate = selectedStartDate.toISOString();
    selectedEndDate = new Date(selectedEndDate);
    selectedEndDate = selectedEndDate.toISOString();
    axios.get(
      `https://api.twelvedata.com/time_series?symbol=${selectedSymbol}&interval=1day&start_date=${selectedStartDate}&end_date=${selectedEndDate}&apikey=6de3af3cc1d24f40968ba5ee2ad444ec`
    ).then(async function (response) {
      finalRes = response.data["values"];
      await getDayWiseGreenRedDayCount(finalRes, finalStock, req.query.startDate.toString(), req.query.endDate.toString(), stockFound);
      res.send({ "dayWiseGreenRedCountMap": dayWiseGreenRedCountMap, "dayWiseGapUpGapDownCountMap": dayWiseGapUpGapDownCountMap, "dayWiseGreenRedMagnitudeMap": dayWiseGreenRedMagnitudeMap, "dayWiseGapMagnitudeMap": dayWiseGapMagnitudeMap, "eventProbability": eventProbability, "conditionalProbability": conditionalProbability });
    });
  } else {
    calculateGreenRedDayCount(finalStock.statsList, req.query.startDate.toString(), req.query.endDate.toString());
    res.send({ "dayWiseGreenRedCountMap": dayWiseGreenRedCountMap, "dayWiseGapUpGapDownCountMap": dayWiseGapUpGapDownCountMap, "dayWiseGreenRedMagnitudeMap": dayWiseGreenRedMagnitudeMap, "dayWiseGapMagnitudeMap": dayWiseGapMagnitudeMap, "eventProbability": eventProbability, "conditionalProbability": conditionalProbability });
  }
}

export const demoChart = async (req, res) => {
  const closingDataResponse = await axios.get(
    "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&outputsize=full&apikey=PC7NYSVUMGVGRVXH");
  const earningsDataResponse = await axios.get(
    "https://www.alphavantage.co/query?function=EARNINGS&symbol=IBM&apikey=PC7NYSVUMGVGRVXH");
  const closingDataResponseMap = closingDataResponse.data;
  const earningsDataResponseMap = earningsDataResponse.data;
  const quartlyEarningsMap = earningsDataResponseMap["quarterlyEarnings"];
  const timeSeriesData = closingDataResponseMap["Time Series (Daily)"];
  const chartData = [];
  for (const key in timeSeriesData) {
    chartData.push({ "date": key, "earningsData": 0, "closingData": Number(timeSeriesData[key]["4. close"]) });
  }
  quartlyEarningsMap.forEach((element) => {
    try {
      const index = chartData.findIndex(
        (chart) => chart['date'] === element['reportedDate']);
      if (index != -1) {
        chartData.at(index).earningsData = Number(element['reportedEPS']);
      }
    } catch (error) {
      print(error);
    }
  });
  return res.send({ "chartData": chartData });
}

function findHighestValue(data) {
  let highestValue = 0;
  for (const day in data) {
    const total = data[day]["greenDayCount"] > data[day]["redDayCount"] ? data[day]["greenDayCount"] : data[day]["redDayCount"];
    if (total > highestValue) {
      highestValue = total;
    }
  }
  return highestValue;
}

export const comparision = async (req, res) => {

  let greenRedDayCountMap = {
    "Monday": { "greenDayCount": 0, "redDayCount": 0 },
    "Tuesday": { "greenDayCount": 0, "redDayCount": 0 },
    "Wednesday": { "greenDayCount": 0, "redDayCount": 0 },
    "Thursday": { "greenDayCount": 0, "redDayCount": 0 },
    "Friday": { "greenDayCount": 0, "redDayCount": 0 },
  };
  const allStocksGreenRedDayCountMap = [];

  for (let index = 0; index < infyData.length; index++) {
    const closeValue = parseFloat(Number(infyData[index]["close"]).toFixed(2));
    const openValue = parseFloat(Number(infyData[index]["open"]).toFixed(2));
    const candleValue = closeValue - openValue;
    const dayName = getDayName(new Date(infyData[index]['datetime']));
    if (dayName in greenRedDayCountMap) {
      if (candleValue >= 0) {
        greenRedDayCountMap[dayName]['greenDayCount'] += 1;
      } else {
        greenRedDayCountMap[dayName]['redDayCount'] += 1;
      }
    }
  }
  allStocksGreenRedDayCountMap.push({"INFY": greenRedDayCountMap});
  greenRedDayCountMap = {
    "Monday": { "greenDayCount": 0, "redDayCount": 0 },
    "Tuesday": { "greenDayCount": 0, "redDayCount": 0 },
    "Wednesday": { "greenDayCount": 0, "redDayCount": 0 },
    "Thursday": { "greenDayCount": 0, "redDayCount": 0 },
    "Friday": { "greenDayCount": 0, "redDayCount": 0 },
  };

  for (let index = 0; index < aaplData.length; index++) {
    const closeValue = parseFloat(Number(aaplData[index]["close"]).toFixed(2));
    const openValue = parseFloat(Number(aaplData[index]["open"]).toFixed(2));
    const candleValue = closeValue - openValue;
    const dayName = getDayName(new Date(aaplData[index]['datetime']));
    if (dayName in greenRedDayCountMap) {
      if (candleValue >= 0) {
        greenRedDayCountMap[dayName]['greenDayCount'] += 1;
      } else {
        greenRedDayCountMap[dayName]['redDayCount'] += 1;
      }
    }
  }
  
  allStocksGreenRedDayCountMap.push({"AAPL": greenRedDayCountMap});
  greenRedDayCountMap = {
    "Monday": { "greenDayCount": 0, "redDayCount": 0 },
    "Tuesday": { "greenDayCount": 0, "redDayCount": 0 },
    "Wednesday": { "greenDayCount": 0, "redDayCount": 0 },
    "Thursday": { "greenDayCount": 0, "redDayCount": 0 },
    "Friday": { "greenDayCount": 0, "redDayCount": 0 },
  };

  for (let index = 0; index < ixicData.length; index++) {
    const closeValue = parseFloat(Number(ixicData[index]["close"]).toFixed(2));
    const openValue = parseFloat(Number(ixicData[index]["open"]).toFixed(2));
    const candleValue = closeValue - openValue;
    const dayName = getDayName(new Date(ixicData[index]['datetime']));
    if (dayName in greenRedDayCountMap) {
      if (candleValue >= 0) {
        greenRedDayCountMap[dayName]['greenDayCount'] += 1;
      } else {
        greenRedDayCountMap[dayName]['redDayCount'] += 1;
      }
    }
  }
  allStocksGreenRedDayCountMap.push({"IXIC": greenRedDayCountMap});

  const highestValues = allStocksGreenRedDayCountMap.map(item => ({
    stock: Object.keys(item)[0],
    highestValue: findHighestValue(item[Object.keys(item)[0]]),
    dayWiseData: item[Object.keys(item)[0]]
  }));

  const sortedStocks = highestValues.sort((a, b) => {
    // Sort by highest values in descending order
    if (b.highestValue !== a.highestValue) {
      return b.highestValue - a.highestValue;
    }
  
    // If values are the same, sort alphabetically
    return a.stock.localeCompare(b.stock);
  });
  res.send({"sortedStocks": sortedStocks});
}