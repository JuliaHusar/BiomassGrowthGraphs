import Papa from "papaparse";
export const getAirQuality = async () => {
    const cutoff = new Date(new Date("2026-04-15T08:00:00") - 24 * 24 * 60 * 60 * 1000);
    const weekCutoff = new Date(new Date("2026-04-15T08:00:00") - 7 * 24 * 60 * 60 * 1000);
    try {
        const response = await fetch('04-17-26.csv')
        const text = await response.text();
        let returnVar = {}
        Papa.parse(text, {
            complete: (results) => {
                //This size of timeData var is dependent on whatever the cutoff is
                // which means that at the moment it will be one cycle (24 days)
                const timeData = results.data
                    .map(d => ({ ...d, timestamp: new Date(d.timestamp) }))
                    .filter(d => d.timestamp >= cutoff)
                    .filter(d => d.scd30_co2_ppm_input !== 0)
                    .filter(d => d.scd30_co2_ppm_output !== 0)
                const weeklyData = timeData.filter((d) => d.timestamp >= weekCutoff) //One week worth of raw input/output values
                const preparedData = (interval = 1) => timeData.filter((val) => new Date(val.timestamp).getHours()).reduce((accumulator, val) => {
                    //using hour key here, we don't want the first hour bcs offset can give us problems
                    // 1 interval is for 1 week while 6 interval is cycle (6*4)
                    //TODO: fix bug that could exclude certain hours that don't have a hh:mm for 00
                    const date = new Date(val.timestamp);
                    const bucketHour = Math.floor(date.getHours() / interval) * interval;
                    date.setHours(bucketHour, 0, 0, 0);
                    const k = date.toISOString();
                    if (!accumulator[k]) {
                        accumulator[k] = { timestamp: date, sum: 0, count: 0, output: [], reduction: [] };
                    }
                    accumulator[k].sum += val.scd30_co2_ppm_input - val.scd30_co2_ppm_output;
                    accumulator[k].output.push(parseInt(val.scd30_co2_ppm_input));
                    accumulator[k].reduction.push(parseInt(val.scd30_co2_ppm_input) - parseInt(val.scd30_co2_ppm_output));
                    accumulator[k].count++;
                    return accumulator;
                }, {});
                const aggregatedDelta = Object.values(preparedData(1)).map(({ timestamp, sum, count, output, reduction }) => ({
                    timestamp,
                    delta: sum / count,
                    output: (() => {return (output[output.length % 2]) - reduction[reduction.length % 2]/2})()
                })); // all data values from one cycle (7 days)
                const aggregatedDayPartDelta = Object.values(preparedData(6)).map(({ timestamp, sum, count, output, reduction }) => ({
                    timestamp,
                    delta: sum / count,
                    output: (() => {return (output[output.length % 2]) - reduction[reduction.length % 2]/2})()
                })); //using for the cycle visualization
                const aggregatedWeeklyDelta = aggregatedDelta.filter((d) => d.timestamp >= weekCutoff) // one week's worth of "delta" data that is used for representing the bubble encoding

                const aggregationFunction = (inputArray, aggregationInterval) => {
                    return inputArray.reduce((acc, d) => {
                        const intervalMs = aggregationInterval * 60 * 1000;
                        const offset = new Date().getTimezoneOffset() * 60 * 1000;
                        const bucketKey = Math.floor((d.timestamp - offset) / intervalMs) * intervalMs + offset;
                        if (!acc[bucketKey]) {
                            acc[bucketKey] = { timestamp: new Date(bucketKey), inputSum: 0, outputSum:0, count: 0 };
                        }
                        acc[bucketKey].inputSum += parseInt(d.scd30_co2_ppm_input);
                        acc[bucketKey].outputSum += parseInt(d.scd30_co2_ppm_output);
                        acc[bucketKey].count += 1;
                        return acc;
                    }, {});
                }
                const result = Object.values(aggregationFunction(weeklyData, 30)).map(({ timestamp, inputSum, outputSum, count }) => ({
                    timestamp,
                    scd30_co2_ppm_input: inputSum / count,
                    scd30_co2_ppm_output: outputSum / count,
                }));
                const calendarResult = Object.values(aggregationFunction(timeData, 30)).map(({ timestamp, inputSum, outputSum, count }) => ({
                    timestamp,
                    scd30_co2_ppm_input: inputSum / count,
                    scd30_co2_ppm_output: outputSum / count,
                }));
               returnVar = { timeData: calendarResult, deltaEncoding: aggregatedDelta, weeklyData: result, aggregatedWeeklyData: aggregatedWeeklyDelta, fifteenMinuteAirQualityAggregation: result, aggregatedDayPartDelta}
            },
            header: true,
            dynamicTyping: true
        })
        return returnVar
    } catch (error) {
        console.log(error)
    }
}
export const getLightData = async () => {
    const cutoff = new Date(new Date("2026-04-15T08:00:00") - 24 * 24 * 60 * 60 * 1000);
    const weekCutoff = new Date(new Date("2026-04-15T08:00:00") - 7 * 24 * 60 * 60 * 1000);
    let returnVar = {}
    try{

        const response = await fetch('light-2026.csv');
        const text = await response.text();
        Papa.parse(text, {
            complete: (results) => {
                const lightData = results.data
                    .map(d => ({ ...d, timestamp: new Date(d.timestamp)}))
                    .filter(d => d.timestamp >= weekCutoff)
                const aggregatedLightData = results.data
                    .map(d => ({ ...d, timestamp: new Date(d.timestamp)}))
                    .filter(d => d.timestamp >= cutoff)
                const preparedData = (interval = 1) => lightData
                    .reduce((accumulator, val) => {
                        const date = new Date(val.timestamp);
                        const bucketHour = Math.floor(date.getUTCHours() / interval) * interval;
                        date.setUTCHours(bucketHour, 0, 0, 0);
                        const k = date.toISOString();
                        if (!accumulator[k]) {
                            accumulator[k] = { timestamp: date, sum: 0, count: 0 };
                        }
                        accumulator[k].sum += val.left_photometric;
                        accumulator[k].count++;
                        return accumulator;
                    }, {});
                const preparedAggregatedData = (interval = 1) => aggregatedLightData
                    .reduce((accumulator, val) => {
                        const date = new Date(val.timestamp);
                        const bucketHour = Math.floor(date.getUTCHours() / interval) * interval;
                        date.setUTCHours(bucketHour, 0, 0, 0);
                        const k = date.toISOString();
                        if (!accumulator[k]) {
                            accumulator[k] = { timestamp: date, sum: 0, count: 0 };
                        }
                        accumulator[k].sum += val.left_photometric;
                        accumulator[k].count++;
                        return accumulator;
                    }, {});
                const aggregatedData = Object.values(preparedData(1)).map(({ timestamp, sum, count}) => ({
                    timestamp,
                    light_in: (() => {return Math.sign(sum/count) === -1 ? 1 : sum/count})()
                })); // all data values from one week (7 days)
                const cycleAggregatedData = Object.values(preparedAggregatedData(1)).map(({ timestamp, sum, count}) => ({
                    timestamp,
                    light_in: (() => {return Math.sign(sum/count) === -1 ? 1 : sum/count})()
                })); // all data values from one cycle (24 days)
                returnVar = {aggregatedData, cycleAggregatedData}
            },
            header: true,
            dynamicTyping: true,
        })
        return returnVar
    } catch (error){
        console.log(error)
    }
}