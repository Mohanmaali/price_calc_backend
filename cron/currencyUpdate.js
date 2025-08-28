const scheduler = require("node-schedule");
const Currency_model = require("../models/currency_model");
const { update_raw_material_for_currency } = require("../controllers/currency_controllers");

function currencyUpdate() {
    scheduler.scheduleJob('0 0,12 * * *', async function () {
        // scheduler.scheduleJob('* * * * *', async function () {
        try {
            const currencies = await Currency_model.find({ regularUpdate: true });

            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const formatDate = (d) => d.toISOString().split('T')[0];
            for (const itm of currencies) {
                const url = `https://api.currencybeacon.com/v1/timeseries?api_key=${process.env.CURRENCY_BEACON_TOKEN}&base=${itm.code}&start_date=${formatDate(yesterday)}&end_date=${formatDate(today)}&symbols=AED`;
                try {
                    const response = await fetch(url);
                    const data = await response.json();
                    if (data && data[formatDate(today)] && data[formatDate(yesterday)]) {
                        const rateToday = data[formatDate(today)]["AED"];
                        const rateYesterday = data[formatDate(yesterday)]["AED"];
                        const fluctuation = ((rateToday - rateYesterday) / rateYesterday) * 100;
                        itm.cost_usd_per_kg = rateToday;
                        itm.fluctuation = fluctuation;
                        const cost_with_fluctuation =
                            rateToday + (fluctuation / 100) * rateToday;
                        itm.cost_usd_per_kg_plus_fluctuation = cost_with_fluctuation
                        await itm.save();
                        await update_raw_material_for_currency(itm._id)
                    } else {
                        console.warn(`Incomplete data for ${itm.code}`);
                    }
                } catch (err) {
                    console.error(`Failed fetching or saving for ${itm.code}:`, err.message);
                }
            }

            console.log("Currency update completed at", new Date().toLocaleString());
        } catch (err) {
            console.error("Currency update job failed:", err.message);
        }
    });
}

module.exports = currencyUpdate
