import axios from "axios";
import Stock from "../models/stock.js";
import LongHoldTRI from "../models/long_hold_tri.js";
import { stockSymbolList } from "../stock_symbol_list.js";
const calculateLongHold = (finalRes, startDate, endDate, baseValue, stockName, closingList) => {
	const finalClosingList = [];
	const dateList = [];
	const returnList = [];
	let closingListIndex = 0;
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
			if (closingListIndex < closingList.length) {
				finalClosingList.push(Number(closingList[closingListIndex]).toFixed(3));
				closingListIndex += 1;
			}
		}
	}
	let baseIndex = Number.parseFloat(baseValue);
	const indexList = [baseIndex];
	for (let i = 1; i < dateList.length; i++) {
		baseIndex = baseIndex * (1 + returnList[i] / 100);
		indexList.push(Number(baseIndex.toFixed(3)));
	}
	return {
		indexList: indexList,
		finalDates: dateList,
		stockName: stockName,
		closingList: finalClosingList
	};
};

export const longHold = async (req, res) => {
	let selectedStartDate = new Date(req.query.startDate);
	selectedStartDate.setUTCHours(0, 0, 0, 0);
	let selectedEndDate = new Date(req.query.endDate);
	selectedEndDate.setUTCHours(0, 0, 0, 0);
	selectedStartDate = selectedStartDate.toISOString();
	selectedEndDate = selectedEndDate.toISOString();
	const selectedSymbol = req.query.symbol;
	const isCustom = req.query.isCustom;
	const stockName = stockSymbolList.find((stock) =>
		`${stock.symbol.toString()}.${stock.exchange}` === selectedSymbol.replace(":", ".")
	).name;
	const stockFindByRequestedDate = await Stock.findOne({
		name: {
			$eq: req.query.symbol
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
			$eq: req.query.symbol
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

	if (finalStock == null) {
		selectedEndDate = new Date(selectedEndDate);
		selectedStartDate = new Date(selectedStartDate);
		if (!(isCustom === "true" && selectedStartDate.getFullYear() < selectedEndDate.getFullYear() - 10)) {
			selectedStartDate = selectedStartDate.setFullYear(selectedEndDate.getFullYear() - 10);
			selectedStartDate = new Date(selectedStartDate);
		}
		selectedEndDate = new Date(selectedEndDate);
		selectedEndDate = selectedEndDate.toISOString();
		selectedStartDate = selectedStartDate.toISOString();
		axios
			.get(
				`https://api.twelvedata.com/time_series?symbol=${selectedSymbol}&interval=1day&start_date=${selectedStartDate}&end_date=${req.query.endDate}&apikey=6de3af3cc1d24f40968ba5ee2ad444ec`
			)
			.then(async function (response) {
				const closingList = [];
				const dateList = [];
				const finalRes = response.data["values"];
				finalRes.pop();
				let openValue = 0;
				for (const key in finalRes) {
					{
						dateList.push(finalRes[key]['datetime']);
						closingList.push(finalRes[key]["close"]);
						openValue = finalRes[key]["open"];
					}
				}
				const returnList = [];
				const finalDates = [];
				const finalClosingList = [];
				for (let i = closingList.length - 2; i >= 0; i--) {
					let returnVal =
						((closingList[i] - closingList[i + 1]) / closingList[i + 1]) * 100;
					returnVal = Number(returnVal.toFixed(3));
					returnList.push(returnVal);
					finalDates.push(dateList[i + 1]);
					finalClosingList.push(closingList[i]);
				}
				finalDates.push(dateList[0]);
				finalClosingList.push(closingList[0]);
				const returnValToDateMap = [];
				// returnList.unshift(Number((((closingList[closingList.length - 1] - openValue) / openValue) * 100).toFixed(3)));
				for (let i = 0; i < finalDates.length; i++) {
					if (i == 0) {
						returnValToDateMap.push({
							date: finalDates[i],
							returnVal: 0,
							closingVal: finalClosingList[i]
						});
					} else {
						returnValToDateMap.push({
							date: finalDates[i],
							returnVal: returnList[i - 1],
							closingVal: finalClosingList[i]
						});
					}
				}
				try {
					const name = req.query.symbol;
					const endDate = finalDates[finalDates.length - 1];
					const returnList = returnValToDateMap;
					const startDate = finalDates[0];
					const requestedStartDate = new Date(req.query.startDate);
					requestedStartDate.setUTCHours(0, 0, 0, 0);
					const requestedEndDate = new Date(req.query.endDate);
					requestedEndDate.setUTCHours(0, 0, 0, 0);
					try {
						(await Stock.deleteOne({
							name: {
								$eq: req.query.symbol
							}
						})).deletedCount;
					} catch (deleteError) {
						res.status(500).send("Server error");
					}
					const newStock = new Stock({
						name,
						startDate,
						endDate,
						requestedStartDate,
						requestedEndDate,
						returnList
					});
					try {
						newStock.save();

					} catch (e) {
						console.log(e);
					}
					res.send(
						calculateLongHold(
							newStock.returnList,
							req.query.startDate.toString(),
							req.query.endDate.toString(),
							req.query.baseValue,
							stockName,
							finalClosingList
						)
					);
				} catch (err) {
					res.status(500).send("Server error");
				}
			})
			.catch(function (error) {
				console.log(error);
			});
	} else {
		selectedStartDate = new Date(selectedStartDate);
		selectedStartDate = selectedStartDate.toISOString();
		axios
			.get(
				`https://api.twelvedata.com/time_series?symbol=${selectedSymbol}&interval=1day&start_date=${selectedStartDate}&end_date=${req.query.endDate}&apikey=6de3af3cc1d24f40968ba5ee2ad444ec`
			)
			.then(async function (response) {
				const finalRes = response.data["values"];
				finalRes.pop();
				const closingList = [];
				for (const key in finalRes) {
					{
						closingList.push(finalRes[key]["close"]);
					}
				}
				const finalClosingList = [];
				for (let i = closingList.length - 2; i >= 0; i--) {
					finalClosingList.push(closingList[i]);
				}
				finalClosingList.push(closingList[0]);
				// console.log(finalStock.returnList);
				const newReturnList = [];
				for (let i = 0; i < finalStock.returnList.length; i++) {
					newReturnList.push({
						date: finalStock.returnList[i].date,
						returnVal: finalStock.returnList[i].returnVal,
						// closingVal: finalClosingList[i]
					});
				}
				// console.log("new return list: ", newReturnList);
				res.send(
					calculateLongHold(
						newReturnList,
						req.query.startDate.toString(),
						req.query.endDate.toString(),
						req.query.baseValue,
						stockName,
						finalClosingList
					)
				);
			})
	}
}

export const longHoldTRI = async (req, res) => {
	let selectedStartDate = new Date(req.query.startDate);
	selectedStartDate.setUTCHours(0, 0, 0, 0);
	let selectedEndDate = new Date(req.query.endDate);
	selectedEndDate.setUTCHours(0, 0, 0, 0);
	selectedStartDate = selectedStartDate.toISOString();
	selectedEndDate = selectedEndDate.toISOString();
	const selectedSymbol = req.query.symbol;
	const isCustom = req.query.isCustom;
	const stockName = stockSymbolList.find((stock) =>
		`${stock.symbol.toString()}.${stock.exchange}` === selectedSymbol.replace(":", ".")
	).name;
	const stockFindByRequestedDate = await LongHoldTRI.findOne({
		name: {
			$eq: req.query.symbol
		},
		requestedStartDate: {
			$lte: selectedStartDate
		},
		requestedEndDate: {
			$gte: selectedEndDate
		}
	});
	const stockFindByActualDate = await LongHoldTRI.findOne({
		name: {
			$eq: req.query.symbol
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
	if (finalStock == null) {
		selectedEndDate = new Date(selectedEndDate);
		selectedStartDate = new Date(selectedStartDate);
		if (!(isCustom === "true" && selectedStartDate.getFullYear() < selectedEndDate.getFullYear() - 10)) {
			selectedStartDate = selectedStartDate.setFullYear(selectedEndDate.getFullYear() - 10);
			selectedStartDate = new Date(selectedStartDate);
		}
		selectedEndDate = new Date(selectedEndDate);
		selectedEndDate = selectedEndDate.toISOString();
		selectedStartDate = selectedStartDate.toISOString();
		let dividendMap = {};
		axios.get(
			`https://api.twelvedata.com/dividends?symbol=${selectedSymbol}&interval=1day&start_date=${selectedStartDate}&end_date=${req.query.endDate}&apikey=6de3af3cc1d24f40968ba5ee2ad444ec`
		).then(async function (response) {
			const dividendRes = response.data["dividends"];
			dividendRes.forEach((dividend) => {
				dividendMap[dividend['payment_date']] = dividend['amount'];
			});
		});
		axios
			.get(
				`https://api.twelvedata.com/time_series?symbol=${selectedSymbol}&interval=1day&start_date=${selectedStartDate}&end_date=${req.query.endDate}&apikey=6de3af3cc1d24f40968ba5ee2ad444ec`
			)
			.then(async function (response) {
				const closingList = [];
				const dateList = [];
				const dividendList = [];
				const finalRes = response.data["values"];
				finalRes.pop();
				let openValue = 0;
				for (const key in finalRes) {
					{
						dateList.push(finalRes[key]['datetime']);
						if (dividendMap[finalRes[key]['datetime']] !== undefined) {
							dividendList.push(dividendMap[finalRes[key]['datetime']]);
						} else {
							dividendList.push(0);
						}
						closingList.push(finalRes[key]["close"]);
						openValue = finalRes[key]["open"];
					}
				}
				const returnList = [];
				const finalDates = [];
				for (let i = closingList.length - 2; i >= 0; i--) {
					let returnVal =
						((closingList[i] - closingList[i + 1] + dividendList[i]) / closingList[i + 1]) * 100;
					returnVal = Number(returnVal.toFixed(3));
					returnList.push(returnVal);
					finalDates.push(dateList[i + 1]);
				}
				finalDates.push(dateList[0]);
				// returnList.unshift(Number((((closingList[closingList.length - 1] - openValue) / openValue) * 100).toFixed(3)));
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
							returnVal: returnList[i - 1],
						});
					}
				}
				try {
					const name = req.query.symbol;
					const endDate = finalDates[finalDates.length - 1];
					const returnList = returnValToDateMap;
					const startDate = finalDates[0];
					const requestedStartDate = new Date(req.query.startDate);
					requestedStartDate.setUTCHours(0, 0, 0, 0);
					const requestedEndDate = new Date(req.query.endDate);
					requestedEndDate.setUTCHours(0, 0, 0, 0);
					try {
						(await LongHoldTRI.deleteOne({
							name: {
								$eq: req.query.symbol
							}
						})).deletedCount;
					} catch (deleteError) {
						res.status(500).send("Server error");
					}
					const newStock = new LongHoldTRI({
						name,
						startDate,
						endDate,
						requestedStartDate,
						requestedEndDate,
						returnList
					});
					try {
						newStock.save();
					} catch (e) {
						console.log(e);
					}
					res.send(
						calculateLongHold(
							newStock.returnList,
							req.query.startDate.toString(),
							req.query.endDate.toString(),
							req.query.baseValue,
							stockName
						)
					);
				} catch (err) {
					res.status(500).send("Server error");
				}
			})
			.catch(function (error) {
				console.log(error);
			});
	} else {
		res.send(
			calculateLongHold(
				finalStock.returnList,
				req.query.startDate.toString(),
				req.query.endDate.toString(),
				req.query.baseValue,
				stockName
			)
		);
	}
}

export const longIntraDay = async (req, res) => {
	let openList = [];
	let closingList = [];
	const dateList = [];
	axios
		.get(
			`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${req.query.symbol}&outputsize=full&apikey=PC7NYSVUMGVGRVXH`
		)
		.then(function (respose) {
			const finalRes = respose.data["Time Series (Daily)"];

			for (const key in finalRes) {
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
				const stock = new Stock({
					name,
					open,
					close
				});
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
					buyTurnOverVal * 0.0003 > 20 ?
						20 :
						parseFloat(Number(buyTurnOverVal * 0.0003).toFixed(3));
				const sellBrokerage =
					sellTurnOverVal * 0.0003 > 20 ?
						20 :
						parseFloat(Number(sellTurnOverVal * 0.0003).toFixed(3));
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

			res.send({
				indexList: indexList,
				finalDates: finalDates
			});
		})
		.catch(function (error) {
			console.log(error);
		});
}