import {stockSymbolList} from "../stock_symbol_list.js";


export const searchTicker = (req, res) => {
    const tickerSymbol = req.query.ticker;
    const availableStocksList = [];
    stockSymbolList.forEach((stockSymbol) => {
        if (stockSymbol['name'].toString().toLowerCase().startsWith(
            tickerSymbol.toLowerCase()) ||
            `${stockSymbol['symbol'].toString()}.${stockSymbol['exchange']}`
                .toString()
                .toLowerCase()
                .startsWith(tickerSymbol.toLowerCase())) {
            availableStocksList.push({
                "stockSymbol":
                    stockSymbol['symbol'].toString() + "." + stockSymbol['exchange'],
                "stockName": stockSymbol['name']
            });
        }
    });
    res.send({ "availableStocksList": availableStocksList });
}