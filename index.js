const { default: axios } = require("axios");
const express = require("express");
const app = express();
const port = process.env.port || 8000;



app.get("/", (req, res) => {
    console.log(req.query)
    const closingList = [];
    axios.get(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${req.query.symbol}&outputsize=compact&apikey=PC7NYSVUMGVGRVXH`).then(function (respose) {
        console.log("Response")
        const finalRes = respose.data["Time Series (Daily)"];
        for (key in finalRes) {
            if(new Date(key) >= new Date(req.query.startDate.toString()) && new Date(key) <= new Date(req.query.endDate.toString())) {
                console.log("Inside if ")
                console.log(key)
                closingList.push(finalRes[key]['4. close']);
            }
        }
        console.log(closingList.length)
        const returnList = [];
        let baseIndex = 100;
        const indexList = [100];
        for (let i = 1; i < closingList.length; i++) {
            let returnVal = ((closingList[i] - closingList[i - 1]) / closingList[i - 1]) * 100;
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