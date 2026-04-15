import {useEffect, useMemo, useRef, useState} from "react";
import Papa from "papaparse";
import * as d3 from 'd3';
import VerticalGraph from "./VerticalGraph.jsx";

const BubbleGraphs = () => {
    const horizontalGraphRef = useRef();
    const treeRef = useRef();
    const verticalRef = useRef();
    const cyclicTreeRef = useRef();
    //TODO: filter out any data where output is higher than input
    //TODO: add maintenance for any data that is null :)

    //selectedView
    const [verticalView, setVerticalView] = useState(false);
    const [granularity, setGranularity] = useState(7); // granularity is being set in terms of days. we can start with 7 and then expand as needed
    const [data, setData] = useState({ timeData: [], deltaEncoding: [], weeklyData: [], aggregatedWeeklyData: [], fifteenMinuteAirQualityAggregation: [], aggregatedDayPartDelta: [] });
    const [lightData, setLightData] = useState({aggregatedData: [], cycleAggregatedData: []});
    const [selectedDaypart, setSelectedDaypart] = useState()
  //  const cycleMap = new Map().set("Cycle 1", [new Date("03/05/2026"), new Date("03/28/2026")])
    const maxGap = 30 * 60 * 1000; //this value must align with whatever the aggregation interval is for the result var. idk why
    const cutoff = new Date(Date.now() - 24 * 24 * 60 * 60 * 1000);
    const weekCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);


    const customTimeFormat = (date) => {
        if (d3.utcDay(date) < date) {
            return d3.utcFormat("%-I %p")(date); // hour + am/pm
        } else { // at date boundaries
            return d3.utcFormat("%b %-d")(date); // month + day
        }
    };

    useEffect(() => {
        const getCSV = async () => {
            try {
                const response = await fetch ('/04-14-2026.csv')
                const text = await response.text();

                Papa.parse(text, {
                    complete: (results) => {
                        //This size of timeData var is dependent on whatever the cutoff is
                        // which means that at the moment it will be one cycle (24 days)
                        const timeData = results.data
                            .map(d => ({ ...d, timestamp: new Date(d.timestamp)}))
                            .filter(d => d.timestamp >= cutoff)
                            .filter(d => d.scd30_co2_ppm_input !== 0)
                            .filter(d => d.scd30_co2_ppm_output !== 0)
                        const weeklyData = timeData.filter((d) => d.timestamp >= weekCutoff) //One week worth of raw input/output values
                        const preparedData = (interval=1) => timeData.filter((val) => new Date(val.timestamp).getHours() !== 16 && new Date(val.timestamp).getDate() !== 3).reduce((accumulator, val) => {
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
                        setData({ timeData: calendarResult, deltaEncoding: aggregatedDelta, weeklyData: result, aggregatedWeeklyData: aggregatedWeeklyDelta, fifteenMinuteAirQualityAggregation: result, aggregatedDayPartDelta});
                    },
                    header: true,
                    dynamicTyping: true,
                })
            } catch (error) {
                console.log(error)
            }
        }
        const getLightData = async () => {
            try{
                const response = await fetch('LightValues-2026-RawValues.csv');
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
                            .filter(val => new Date(val.timestamp).getUTCHours() !== 16 && new Date(val.timestamp).getUTCDate() !== 3)
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
                            .filter(val => new Date(val.timestamp).getUTCHours() !== 16 && new Date(val.timestamp).getUTCDate() !== 3)
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
                        setLightData({aggregatedData, cycleAggregatedData})
                    },
                    header: true,
                    dynamicTyping: true,
                })

            } catch (error){
                console.log(error)
            }
        }
        getCSV();
        getLightData();
    }, []);

    const scales = useMemo(() => {
        if (data.timeData.length === 0) return;
        const weeklyConstraints = {width: 1000, height: 500, marginTop:20, marginRight: 30, marginBottom: 30, marginLeft: 40}
        const hasNext = new Set(
            data.weeklyData
                .slice(0, -1)
                .filter((d, i) => data.weeklyData[i + 1].timestamp - d.timestamp <= maxGap)
                .map(d => d.timestamp)
        );
        hasNext.add(data.weeklyData.at(-1).timestamp);

        const x = d3.scaleUtc(d3.extent(data.weeklyData, d => d.timestamp), [weeklyConstraints.marginLeft, weeklyConstraints.width - weeklyConstraints.marginRight]);
        // start y-axis from 300 to make vis larger and patterns clearer
        const y = d3.scaleLinear([300, d3.max(data.weeklyData, d => d.scd30_co2_ppm_input)], [weeklyConstraints.height - weeklyConstraints.marginTop, weeklyConstraints.marginBottom])
        const r= d3.scaleLinear([0, d3.max(data.deltaEncoding, d => Math.abs(d.delta))], [0, 30]).clamp(true);
        const line = d3.line()
            .defined(d => !isNaN(d.timestamp) && hasNext.has(d.timestamp))
            .x(d => x(d.timestamp))
            .y(d => y(d.scd30_co2_ppm_input))

        const outputLine = d3.line()
            .defined(d => !isNaN(d.timestamp) && hasNext.has(d.timestamp))
            .x(d => x(d.timestamp))
            .y(d => y(d.scd30_co2_ppm_output))

       /* const thresholdLine = d3.line()
            .x(d => x(d.timestamp))
            .y(d => y(1000))

        */

        // for formatting time format on x-axis
        return { x, y, r, line, outputLine };
    }, [data.timeData.length, data.weeklyData, data.deltaEncoding, maxGap]);

    useEffect(() => {
        if (!scales) return;
        if (!horizontalGraphRef.current) return;
        if (granularity === 24) return;
        const weeklyConstraints = {width: 2000, height: 500, marginTop:20, marginRight: 30, marginBottom: 30, marginLeft: 40}

        const draw = () => {
            const { x, y, r, line, outputLine } = scales;
            const svg = d3.select(horizontalGraphRef.current);
            svg.selectAll("*").remove();
            svg
                .attr('width', weeklyConstraints.width)
                .attr('height', weeklyConstraints.height);

            const g = svg.append("g")
                .attr("class", "first-group")

            // x axis
            g.append("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0,${weeklyConstraints.height - weeklyConstraints.marginBottom})`)
                .call(
                    d3.axisBottom(x)
                        .ticks(d3.utcHour.every(12)) // ticks every 3 hours
                        // .ticks(width / 80)
                        .tickFormat(customTimeFormat)
                );

            // vertical line at date boundaries
            g.append("g")
                .attr("transform", `translate(0,${weeklyConstraints.height - weeklyConstraints.marginBottom})`)
                .attr("class", "vertical-line")
                .call(
                    d3.axisBottom(x)
                        .ticks(d3.utcHour.every(12)) // ticks at day boundaries
                        .tickSize(-(weeklyConstraints.height - weeklyConstraints.marginTop - weeklyConstraints.marginBottom)) // extend tick upward
                        .tickFormat("") // hide tick labels
                )
                .call(g => g.select(".domain").remove()) // remove axis line
                .call(g => g.selectAll(".tick line")
                    .attr("stroke", "black")
                    .attr("stroke-opacity", 0.06)
                    .attr("stroke-width", 2.5)
                );

            //y axis
            g.append("g")
                .attr('class', 'y-axis')
                .attr("transform", `translate(${weeklyConstraints.marginLeft},0)`)
                .call(g => g.select(".domain").remove())
                .call(g => g.selectAll(".tick").clone()
                    .attr("x2", weeklyConstraints.width - weeklyConstraints.marginLeft - weeklyConstraints.marginRight)
                    .attr("stroke-opacity", 0.1))
                .call(d3.axisLeft(y).ticks(weeklyConstraints.height / 50)) // reduce number of ticks

            const dayKeys = [...new Set(lightData.aggregatedData.map(d => d.timestamp.toISOString().slice(0, 10)))];

            const lightY = d3.scaleLinear()
                .domain([0, d3.max(lightData.aggregatedData, d => d.light_in)])
                .range([weeklyConstraints.marginBottom, weeklyConstraints.height -  weeklyConstraints.marginTop - 300]);
            const color = d3.scaleLog().domain([d3.min(lightData.aggregatedData, d=> d.light_in),d3.max(lightData.aggregatedData, d => d.light_in)])
                         .range(["#FFF8E1", "#FFECB3", "#FFE082", "#FFD54F, #FFCA28"])
            dayKeys.forEach(day => {
                const dayRecords = lightData.aggregatedData.filter(d => d.timestamp.toISOString().slice(0, 10) === day);
                g.append("g")
                    .attr("class", `light-day`)
                    .selectAll("rect")
                    .data(dayRecords)
                    .join("rect")
                    .attr("x", d => x(d.timestamp))
                    .attr("y", d => lightY(weeklyConstraints.height - weeklyConstraints.marginBottom))
                    .attr("width", weeklyConstraints.width / 24)
                    .attr("height", weeklyConstraints.height - weeklyConstraints.marginTop - weeklyConstraints.marginBottom)
                    .attr("fill", d => color(d.light_in))
                    .attr("opacity", 0.5)
                    .attr("clip-path", "url(#clip)")
                    .attr("pointer-events", "none");
            });


            g.append("path")
                .attr("class", "input-data")
                .attr("fill", "none")
                .attr("clip-path", "url(#clip)")
                .attr("stroke", "#62a247")
                .attr("stroke-width", 1)
                .attr("d", line(data.weeklyData))
                .attr("class", "input-line")

            g.append("path")
                .attr("class", "output-data")
                .attr("fill", "none")
                .attr("clip-path", "url(#clip)")
                .attr("stroke", "#9FBC93")
                .attr("stroke-width", 1)
                .attr("d", outputLine(data.weeklyData))
                .attr("class", "output-line")
            /*
            g.append("path")
                .attr("fill", "none")
                .attr("clip-path", "url(#clip)")
                .attr("stroke", "black")
                .style("stroke-dasharray", "2, 2")
                .attr("stroke-width", 0.6)
                .attr("opacity", 0.7)
                .attr("d", thresholdLine(data.weeklyData));

             */

            g.append("g")
                .attr("class", "sequestration")
                .selectAll("circle")
                .data(data.aggregatedWeeklyData)
                .join("circle")
                .attr("cx", d => x(d.timestamp))
                .attr("cy", d => y(d.output))
                .attr("r", d => r(d.delta))
                .attr("fill", "#5bb335")
                .attr("opacity", 0.7)

            let tooltip = d3.selectAll(".daypartRect")
                .append("div")
                .style("opacity", 0)
                .attr("class", "tooltip")
                .style("background-color", "white")
                .style("border", "solid")
                .style("border-width", "2px")
                .style("border-radius", "5px")
                .style("padding", "5px")

            g.append("defs").append("clipPath")
                .attr("id", "clip")
                .append("rect")
                .attr("x", weeklyConstraints.marginLeft)
                .attr("y", weeklyConstraints.marginTop)
                .attr("width", weeklyConstraints.width - weeklyConstraints.marginLeft - weeklyConstraints.marginRight)
                .attr("height", weeklyConstraints.height - weeklyConstraints.marginTop - weeklyConstraints.marginBottom);

            let mouseover = function(d){
                tooltip.style("opacity", 1)
                d3.select(this)
                    .style("stroke", "black")
                    .style("opacity", 1)
                console.log(d.target.__data__)
            }
            let mouseleave = function(d) {
                tooltip
                    .style("opacity", 0)
                d3.select(this)
                    .style("stroke", "none")
                    .style("opacity", 0.8)
            }

            //TODO: fix bug in selector that selects four hours minus
            const tickValues = x.ticks(d3.utcHour.every(1));
            g.append("g")
                .attr("transform", `translate(-25, 0)`)
                .attr("class", "daypartRect")
                .selectAll("rect")
                .data(tickValues.map((d) => new Date(d))) //there's so weird timezone fuckery happening
                .join("rect")
                .attr("x", d => x(d))
                .attr("y", weeklyConstraints.marginTop)
                .attr("width", (d, i) => x(tickValues[i + 1]) - x(d))
                .attr("height", weeklyConstraints.height - weeklyConstraints.marginTop - weeklyConstraints.marginBottom)
                .attr("fill", () => "rgba(0,0,0,0)")
                .on("mouseover", mouseover)
                .on("mouseleave", mouseleave)

        }
        const verticalDraw = () => {
            if (data.timeData.length === 0) return;
            const constraints = {width: 1000, height: 800, marginTop:20, marginRight: 30, marginBottom: 30, marginLeft: 40}
            //TODO: add spacing + format these small multiples neatly
            //TODO: add cursor that shows comparisons between different days in a way that is intuitive.
            const svg = d3.select(horizontalGraphRef.current);

            svg.selectAll("*").remove();


            svg
                .attr('width', constraints.width)
                .attr('height', 1000);

            const maxGap = 15 * 60 * 1000;
            console.log(data.weeklyData)
            const hasNext = new Set(
                data.weeklyData
                    .slice(0, -1)
                    .filter((d, i) => data.weeklyData[i + 1].timestamp - d.timestamp <= maxGap)
                    .map(d => d.timestamp)
            );
            hasNext.add(data.weeklyData.at(-1).timestamp);

            const x = d3.scaleUtc(d3.extent(data.weeklyData, d => d.timestamp), [constraints.marginLeft, constraints.width - constraints.marginRight]);
            const r = d3.scaleLinear([0, d3.max(data.deltaEncoding, d => Math.abs(d.delta))], [0, 30]).clamp(true);

            // for formatting time format on x-axis
            const customTimeFormat = (date) => {
                if (d3.utcDay(date) < date) {
                    return d3.utcFormat("%-I %p")(date); // hour + am/pm
                } else { // at date boundaries
                    return d3.utcFormat("%b %-d")(date); // month + day
                }
            };
            let dayBuckets = d3.group(
                data.weeklyData,
                d => new Date(d.timestamp).toISOString().slice(0, 10)
            );


            // vertical line at date boundaries. commenting out for simplicity here
            /*
            svg.append("g")
                .attr("transform", `translate(0,${constraints.height - constraints.marginBottom})`)
                .call(
                    d3.axisBottom(x)
                        .ticks(d3.utcDay)
                        .tickSize(-(constraints.height - constraints.marginTop - constraints.marginBottom))
                        .tickFormat("")
                )
                .call(g => g.select(".domain").remove())
                .call(g => g.selectAll(".tick line")
                    .attr("stroke", "black")
                    .attr("stroke-opacity", 0.06)
                    .attr("stroke-width", 2.5)
                );

             */

            // what if we had like a sort of look up container where people could choose a date that they wanted to compare??? if we're really looking at user needs here

            const row = d3.scaleBand()
                .domain([...dayBuckets.keys()])
                .range([constraints.marginLeft, constraints.width - constraints.marginRight])
                .padding(0.05);

            const cellContainer = svg.append('g').attr('class', 'cells')
                .attr("height", constraints.height)
                .attr('transform', 'translate(50, 0)')


            const cells = cellContainer.selectAll('g.day-cell')
                .data([...dayBuckets.entries()])
                .join(enter => enter.append('g').attr('class', 'day-cell'))
                .attr('transform', ([day]) => `translate(0, ${row(day)})`);

            svg.append("defs").selectAll("clipPath.day-clip")
                .data([...dayBuckets.entries()])
                .join(enter => enter.append("clipPath").attr("class", "day-clip"))
                .attr("id", ([day]) => `clip-${day}`)
                .append("rect")
                .attr("x", 0)
                .attr("y", constraints.marginTop)
                .attr("width", constraints.width)
                .attr("height", constraints.height - constraints.marginTop - constraints.marginBottom);


            cells.each(function([day, records]) {
                const cell = d3.select(this);
                const bandwidth = constraints.width;

                const dayStart = new Date(day + "T00:00:00Z");
                const dayEnd   = new Date(day + "T24:00:00Z");

                const xLocal = d3.scaleUtc()
                    .domain([dayStart, dayEnd])
                    .range([0, bandwidth]);

                //we want to get the overall max and keep y-axes consistent, or else people might misinterpret encodings
                //we could do this programatically but for simplicity's sake i'm doing it with 650 as that's a reasonable bound
                const newY = d3.scaleLinear(
                    [300, 650],
                    [(constraints.height/4 - constraints.marginTop), constraints.marginBottom * 2]
                    //this controls the height of the individual cells that we're plotting. we can play around with it?
                );

                const localLine = d3.line()
                    .x(d => xLocal(d.timestamp))
                    .y(d => newY(d.scd30_co2_ppm_input));

                const localOutputLine = d3.line()
                    .x(d => xLocal(d.timestamp))
                    .y(d => newY(d.scd30_co2_ppm_output));

                cell.append("g")
                    .attr('class', 'cell-y-axis')
                    .call(g => g.select(".domain").remove())
                    .call(g => g.selectAll(".tick line").clone()
                        .attr("x2", constraints.width - constraints.marginLeft - constraints.marginRight)
                        .attr("stroke-opacity", 0.1))
                    .call(d3.axisLeft(newY).ticks(bandwidth / 200));
                cell.append("path")
                    .attr("fill", "none")
                    .attr("clip-path", `url(#clip-${day})`)
                    .attr("stroke", "#62a247")
                    .attr("stroke-width", 1)
                    .attr("d", localLine(records));

                cell.append("path")
                    .attr("fill", "none")
                    .attr("clip-path", `url(#clip-${day})`)
                    .attr("stroke", "#9FBC93")
                    .attr("stroke-width", 1)
                    .attr("d", localOutputLine(records));

            });
            // x axis

            cellContainer.append("g")
                .attr("transform", `(0,${- constraints.marginBottom})`)
                .call(
                    d3.axisBottom(x)
                        .ticks(d3.utcHour.every(6)) // ticks every 6 hours
                        // .ticks(width / 80)
                        .tickFormat(customTimeFormat)
                );
        }

        !verticalView ? draw() : verticalDraw()

    }, [data, scales, granularity, verticalView, lightData]);

    useEffect(() => {
        const cycleConstraints = {width: 1000, height: 200, marginTop:20, marginRight: 50, marginBottom: 50, marginLeft: 40}

        if (!scales || !horizontalGraphRef.current) return;
        if (data.weeklyData.length === 0) return;
        if (granularity === 7) return;
        const weeklyConstraints = {width: 2000, height: 500, marginTop:20, marginRight: 30, marginBottom: 30, marginLeft: 40}



        const svg = d3.select(horizontalGraphRef.current);
        svg.select(".input-line").transition().remove();
        svg.select(".output-line").transition().remove();
        svg.selectAll(".daypartRect").remove();
        svg.selectAll(".light-day").remove();

        const constraints = granularity === 24 ? cycleConstraints : weeklyConstraints;
        const activeData = granularity === 24 ? data.timeData : data.weeklyData;
        const activeAggregated = granularity === 24 ? data.aggregatedDayPartDelta : data.aggregatedWeeklyData; //if cycle is selected we'll map the delta encoding for all 24 days

        const newY = d3.scaleLinear(
            [300, d3.max(activeData, d => d.scd30_co2_ppm_input)],
            [constraints.height - constraints.marginTop, constraints.marginBottom]
        );
        const x = d3.scaleUtc(d3.extent(activeData, d => d.timestamp), [weeklyConstraints.marginLeft, weeklyConstraints.width - weeklyConstraints.marginRight]);
        const filteredX = d3.scaleUtc(d3.extent(activeData, d=> d.timestamp), [cycleConstraints.marginLeft, cycleConstraints.width - cycleConstraints.marginRight])
        const transitionR = d3.scaleLinear(
            [0, d3.max(activeAggregated, d => Math.abs(d.delta))],
            [0, granularity === 24 ? 15 : 30]
        ).clamp(true);
        const hasNext = new Set(
            activeData
                .slice(0, -1)
                .filter((d, i) => activeData[i + 1].timestamp - d.timestamp <= maxGap)
                .map(d => d.timestamp)
        );
        hasNext.add(activeData.at(-1).timestamp);

        const newLine = d3.line()
            .defined(d => !isNaN(d.timestamp) && hasNext.has(d.timestamp))
            .x(d => (granularity=== 24 ? filteredX : x) (d.timestamp))
            .y(d => newY(d.scd30_co2_ppm_input))

        const newOutputLine = d3.line()
            .defined(d => !isNaN(d.timestamp) && hasNext.has(d.timestamp))
            .x(d => (granularity=== 24 ? filteredX: x)(d.timestamp))
            .y(d => newY(d.scd30_co2_ppm_output))

        /*
        const newThresholdLine = d3.line()
            .x(d => (granularity=== 24 ? filteredX: x)(d.timestamp))
            .y(d => newY(1000))

         */

        const t = svg.transition().duration(500);

        t.attr('height', constraints.height);

        svg.select(".x-axis")
            .transition(t)
            .attr("transform", `translate(0,${constraints.height - constraints.marginBottom})`)
            .call(
                d3.axisBottom(granularity === 24 ? filteredX : x)
                    .ticks(d3.utcHour.every(12))
                    .tickFormat(customTimeFormat)
            );

        svg.select(".y-axis").transition(t)
            .call(d3.axisLeft(newY).ticks(constraints.height / 50));

        svg.select(".input-line").transition(t)
            .attr("d", newLine(activeData));

        svg.select(".output-line").transition(t)
            .attr("d", newOutputLine(activeData));

        svg.selectAll("circle").transition(t)
            .attr("cy", d => newY(d.output))
            .attr("r", d => transitionR(d.delta));

        svg.select(".vertical-line")
            .transition(t)
            .attr("transform", `translate(0,${constraints.height - constraints.marginBottom})`)
            .call(
                d3.axisBottom(x)
                    .ticks(d3.utcDay)
                    .tickSize(-(constraints.height - constraints.marginTop - constraints.marginBottom))
                    .tickFormat("")
            )
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line")
                .attr("stroke", "black")
                .attr("stroke-opacity", 0.06)
                .attr("stroke-width", 2.5)
            );
        svg.selectAll("circle").transition(t)
            .attr("cx", d => (granularity === 24 ? filteredX : x)(d.timestamp))
            .attr("cy", d => newY(d.output))
            .attr("r", d => transitionR(d.delta));

        const weekBuckets = d3.group(
            activeData,
            d => {
                const t = d.timestamp;
                const weekStart = new Date(t);
                weekStart.setUTCHours(0, 0, 0, 0);
                weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
                return weekStart.toISOString().slice(0, 10);
            }
        );
        const weekLightBuckets = d3.group(
            lightData.cycleAggregatedData,
            d => {
                const t = d.timestamp;
                const weekStart = new Date(t);
                weekStart.setUTCHours(0, 0, 0, 0);
                weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
                return weekStart.toISOString().slice(0, 10);
            }
        );



        if(granularity === 24){
            svg.selectAll(".cells").remove();
            svg.selectAll(".week-clip").remove();
            svg.selectAll(".daypartRect").remove();
            svg.select(".threshold-line").transition().remove();
            svg.select(".x-axis").transition().remove();
            svg.select(".y-axis").transition().remove();
            svg.select(".input-line").transition().remove();
            svg.select(".output-line").transition().remove();

            t.on("end", () => {

                svg.selectAll("circle").transition().remove();
                svg.select(".vertical-line").remove();
                const row = d3.scaleBand()
                    .domain([...weekBuckets.keys()])
                    .range([0, constraints.height * weekBuckets.size])
                    .padding(0.05);
                svg.attr("height", row.range()[1] + constraints.marginBottom);

                const cellContainer = svg.append('g').attr('class', 'cells');

                const cells = cellContainer.selectAll('g.week-cell')
                    .data([...weekBuckets.entries()])
                    .join(enter => enter.append('g').attr('class', 'week-cell'))
                    .attr('transform', ([week]) => `translate(0, ${row(week)})`)

                svg.append("defs").selectAll("clipPath.week-clip")
                    .data([...weekBuckets.entries()])
                    .join(enter => enter.append("clipPath").attr("class", "week-clip"))
                    .attr("id", ([week]) => `clip-${week}`)
                    .append("rect")
                    .attr("x", constraints.marginLeft)
                    .attr("y", 0)
                    .attr("width", constraints.width - constraints.marginLeft - constraints.marginRight)
                    .attr("height", row.bandwidth())

                cells.each(function([week, records]) {

                    const cell = d3.select(this);
                    const bandwidth = row.bandwidth();

                    const weekStart = new Date(week + "T00:00:00Z");
                    const weekEnd   = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

                    const xLocal = d3.scaleUtc()
                        .domain([weekStart, weekEnd])
                        .range([constraints.marginLeft, constraints.width - constraints.marginRight]);

                    const yLocal = d3.scaleLinear(
                        [300, d3.max(activeData, d => d.scd30_co2_ppm_input)],
                        [row.bandwidth(), 0]
                    );
                    const r= d3.scaleLinear([0, d3.max(activeAggregated, d => Math.abs(d.delta))], [0, 30]).clamp(true);

                    const weekAggregated = activeAggregated.filter(
                        d => d.timestamp >= weekStart && d.timestamp < weekEnd
                    );

                    const localHasNext = new Set(
                        records.slice(0, -1)
                            .filter((d, i) => records[i + 1].timestamp - d.timestamp <= maxGap)
                            .map(d => d.timestamp)
                    );
                    if (records.length > 0) localHasNext.add(records.at(-1).timestamp);

                    const localLine = d3.line()
                        .defined(d => !isNaN(d.timestamp) && localHasNext.has(d.timestamp))
                        .x(d => xLocal(d.timestamp))
                        .y(d => yLocal(d.scd30_co2_ppm_input));

                    const localOutputLine = d3.line()
                        .defined(d => !isNaN(d.timestamp) && localHasNext.has(d.timestamp))
                        .x(d => xLocal(d.timestamp))
                        .y(d => yLocal(d.scd30_co2_ppm_output));

                    const xAxis = d3.axisBottom(xLocal)
                        .ticks(d3.utcHour.every(6))
                        .tickFormat(d => d3.utcFormat("%-I %p")(d));

                    const xAxisGroup = cell.append("g")
                        .attr("class", "cell-x-axis")
                        .attr("transform", `translate(0, ${bandwidth})`)
                        .call(xAxis);

                    xAxisGroup.selectAll(".tick")
                        .filter(d => d.getUTCHours() === 0)
                        .append("text")
                        .attr("class", "date-label")
                        .attr("y", 30)
                        .attr("text-anchor", "middle")
                        .attr("fill", "currentColor")
                        .text(d => d3.utcFormat("%B %d")(d));

                    cell.append("g")
                        .attr("class", "cell-y-axis")
                        .attr("transform", `translate(${constraints.marginLeft}, 0)`)
                        .call(g => g.select(".domain").remove())
                        .call(g => g.selectAll(".tick line").clone()
                            .attr("x2", constraints.width - constraints.marginLeft - constraints.marginRight)
                            .attr("stroke-opacity", 0.1))
                        .call(d3.axisLeft(yLocal).ticks(bandwidth / 50));

                    const filteredDayKeys = [...new Set((weekLightBuckets.get(week).map(d => d.timestamp.toISOString().slice(0, 10))))];
                    const lightY = d3.scaleLinear()
                        .domain([0, d3.max(lightData.cycleAggregatedData, d => d.light_in)])
                        .range([constraints.marginBottom, constraints.height -  constraints.marginTop + 400]);
                    const color = d3.scaleLog().domain([d3.min(lightData.cycleAggregatedData, d=> d.light_in),d3.max(lightData.cycleAggregatedData, d => d.light_in)])
                        .range(["#FFF8E1", "#FFECB3", "#FFE082", "#FFD54F, #FFCA28"])
                    filteredDayKeys.forEach(day => {
                        const dayRecords = lightData.cycleAggregatedData.filter(d => d.timestamp.toISOString().slice(0, 10) === day);
                        cell.append("g")
                            .attr("class", `light-day`)
                            .selectAll("rect")
                            .data(dayRecords)
                            .join("rect")
                            .attr("x", d => xLocal(d.timestamp))
                            .attr("y", d => lightY(constraints.height - constraints.marginBottom))
                            .attr("width", constraints.width / 24)
                            .attr("height", constraints.height - constraints.marginTop - constraints.marginBottom)
                            .attr("fill", d => color(d.light_in))
                            .attr("opacity", 0.5)
                            .attr("clip-path", "url(#clip)")
                            .attr("pointer-events", "none");
                    });


                    cell.append("path")
                        .transition()
                        .attr("fill", "none")
                        .attr("clip-path", `url(#clip-${week})`)
                        .attr("stroke", "#62a247")
                        .attr("stroke-width", 1)
                        .attr("d", localLine(records));

                    cell.append("path")
                        .transition()
                        .attr("fill", "none")
                        .attr("clip-path", `url(#clip-${week})`)
                        .attr("stroke", "#9FBC93")
                        .attr("stroke-width", 1)
                        .attr("d", localOutputLine(records));

                    cell.append("g")
                        .selectAll("circle")
                        .data(weekAggregated)
                        .join("circle")
                        .attr("cx", d => xLocal(d.timestamp))
                        .attr("cy", d => yLocal(d.output))
                        .attr("r", d => r(d.delta))
                        .attr("fill", "#5bb335")
                        .attr("opacity", 0.7)

                    let mouseover = function(d){
                        tooltip.style("opacity", 1)
                        d3.select(this)
                            .style("stroke", "black")
                            .style("opacity", 1)
                        console.log(d.target.__data__)
                    }
                    let mouseleave = function(d) {
                        tooltip
                            .style("opacity", 0)
                        d3.select(this)
                            .style("stroke", "none")
                            .style("opacity", 0.8)
                    }

                    let tooltip = d3.selectAll(".daypartRect")
                        .append("div")
                        .style("opacity", 0)
                        .attr("class", "tooltip")
                        .style("background-color", "white")
                        .style("border", "solid")
                        .style("border-width", "2px")
                        .style("border-radius", "5px")
                        .style("padding", "5px")

                    const tickValues = xLocal.ticks(d3.utcHour.every(8));

                    cell.append("g")
                        .attr("transform", `translate(-20, 0)`)
                        .attr("class", `calendarPartRect${records}`)
                        .selectAll("rect")
                        .data(tickValues.slice(0, -1))
                        .join("rect")
                        .attr("x", d => xLocal(d-1))
                        .attr("y", constraints.marginTop + 35)
                        .attr("width", (d, i) => xLocal(tickValues[i + 1]) - xLocal(d))
                        .attr("height", constraints.height - constraints.marginTop - constraints.marginBottom)
                        .attr("fill", () => "rgba(0,0,0,0)")
                        .on("mouseover", mouseover)
                        .on("mouseleave", mouseleave)
                });
            });

        } else {
            svg.selectAll(".cells").transition().remove();
            svg.selectAll(".day-clip").transition().remove();
        }



    }, [data.deltaEncoding, data.aggregatedWeeklyData, data.timeData, data.weeklyData, granularity, maxGap, scales, data.aggregatedDayPartDelta, lightData]);

    useEffect(() => {
        const weeklyConstraints = {width: 2000, height: 500, marginTop:20, marginRight: 30, marginBottom: 30, marginLeft: 40}
        const drawStandardTree = async () => {
            const treeHeight = 500;
            const treeWidth = 500;
            const centerY = treeHeight / 2;
            const centerX = treeWidth / 2;
            const top = centerY + 50;
            const bottom = centerY + 240;
            const left = centerX - 50;
            const right = centerY + 50;

            const treeLineData = [
                { x: left + 20, y: top },
                { x: right - 20, y: top },
                { x: right, y: bottom },
                { x: left, y: bottom },
                { x: left + 20, y: top },
            ]
            const svg = d3.select(treeRef.current);
            svg.selectAll("*").remove();
            svg
                .attr('width', treeHeight)
                .attr('height', treeWidth);
            svg.append("g")

            /*
            const treeGroup = svg.append("g")
                .attr("width", 100)
                .attr("height", 100)

             */

            var treeLine = d3.line()
                .x((p) => p.x)
                .y((p) => p.y)
                .curve(d3.curveBumpX)
                .curve(d3.curveBumpY)

            svg.append("path")
                .attr("d", treeLine(treeLineData))
                .attr("fill", "none")
                .attr("stroke", "brown");

            const r = d3.scaleLinear([0, d3.max(data.deltaEncoding, d => Math.abs(d.delta))], [0, 30]).clamp(true)
            const pack = d3.pack()
                .size([treeWidth - weeklyConstraints.marginLeft * 6, weeklyConstraints.height - weeklyConstraints.marginTop * 6])
                .radius(d => r(d.value))
                .padding(4);
            const filteredDays = data.deltaEncoding.filter((day) => (new Date(day.timestamp).getUTCDate()) === new Date("April 04, 2026").getUTCDate())


            const root = pack(d3.hierarchy({ children: data.deltaEncoding })
                .sum(d => d.delta))

            svg.append("rect")
                .attr("x", left)
                .attr("y", centerY - 20)
                .attr("width", 100)
                .attr("height", 100)
                .attr("fill", "white");

            const node = svg.append("g")
                .attr("transform", "translate(120, 40)")
                .selectAll()
                .data(root.leaves())
                .join("g")
                .attr("transform", d => `translate(${d.x},${d.y})`)

            const color = d3.scaleSequential()
                .domain([0, d3.max(filteredDays, d => d.delta)])
                .interpolator(d3.interpolateGreens);
            node.append("circle")
                .attr("fill-opacity", 0.7)
                .attr("fill", d => color(d.value))
                .attr("r", d => d.r);

        }
        drawStandardTree()
        const drawCyclicTree = async () => {
            const treeHeight = 500;
            const treeWidth = 500;
            const centerY = treeHeight/2;
            const centerX = treeWidth/2;
            const top = centerY + 50;
            const bottom = centerY + 240;
            const left = centerX - 50;
            const right = centerY + 50;
            const clockRadius = 120;
            /*
            const secondTickStart = clockRadius - 20;
            const secondTickLength = -10;
            const labelRadius = clockRadius + 16;
            const secondLabelYOffset = 5;

             */
            const radians = Math.PI /180

            const treeLineData = [
                { x: left + 20, y: top },
                { x: right - 20, y: top },
                { x: right, y: bottom },
                { x: left, y: bottom },
                { x: left + 20, y: top },
            ]
            const svg = d3.select(cyclicTreeRef.current);
            svg.selectAll("*").remove();
            svg
                .attr('width', treeHeight)
                .attr('height', treeWidth);
            svg.append("g")

            var treeLine = d3.line()
                .x((p) => p.x)
                .y((p) => p.y)
                .curve(d3.curveBumpX)
                .curve(d3.curveBumpY)

            svg.append("path")
                .attr("d", treeLine(treeLineData))
                .attr("fill", "none")
                .attr("stroke", "brown");

            const r = d3.scaleLinear([0, d3.max(data.deltaEncoding, d => Math.abs(d.delta))], [0, 30]).clamp(true)
            const filteredDays = data.deltaEncoding.filter((day) => (new Date(day.timestamp).getDate()) === new Date("April 08, 2026").getDate())

            svg.append("rect")
                .attr("x", left)
                .attr("y", centerY-20)
                .attr("width", 100)
                .attr("height", 100)
                .attr("fill", "white");

            svg.append("g")
                .selectAll("path")
                .data(filteredDays)
                .enter()
                .append("path")
                .attr("fill", "#69b3a2")
                .attr("d", d3.arc()
                    .innerRadius(clockRadius))

            const g = svg.append("g")
                .attr("transform", `translate(${centerX}, ${centerY-20})`);

            const twentyfourHours = d3
                .scaleLinear()
                .range([0, 360])
                .domain([0, 24]);

            const color = d3.scaleSequential()
                .domain([0, d3.max(filteredDays, d => d.delta)])
                .interpolator(d3.interpolateGreens);

            g.selectAll(".hour-data")
                .data(filteredDays)
                .enter()
                .append("circle")
                .attr("cx", d => clockRadius * Math.sin(twentyfourHours(new Date(d.timestamp).getHours()) * radians))
                .attr("cy", d => -clockRadius * Math.cos(twentyfourHours(new Date(d.timestamp).getHours()) * radians) + 5)
                .attr("r", d => r(d.delta))
                .attr("fill", d => color(d.delta))
                .attr("opacity", 0.7)


            g.selectAll(".hour-label")
                .data(filteredDays)
                .enter()
                .append("text")
                .attr("text-anchor", "middle")
                .attr("x", d => 140 * Math.sin(twentyfourHours(new Date(d.timestamp).getHours()) * radians))
                .attr("y", d => -140 * Math.cos(twentyfourHours(new Date(d.timestamp).getHours()) * radians) + 5)
                .text(d => new Date(d.timestamp).getHours() + ":00")

            /*
            g.selectAll(".hour-tick")
                .data(d3.range(0, 24))
                .enter()
                .append("line")
                .attr("x1", 0)
                .attr("x2", 0)
                .attr("y1", secondTickStart)
                .attr("y2", secondTickStart + secondTickLength)
                .attr("stroke", "black")
                .attr("transform", d => `rotate(${twentyfourHours(d)})`);

             */

        }
        drawCyclicTree()
    }, [data]);

    const changeGranularity = (val) => {
        //we're starting on 7 days so the granularity change should start from that state
        setGranularity(val)
    }



    return (
        <div className='flex flex-row w-full h-full'>
            <div className=' overflow-x-scroll'>
                <div>
                    <button id='horizontal' onClick={() => setVerticalView(false)}>Horizontal</button>
                    <button id='vertical' onClick={() => setVerticalView(true)}>Vertical</button>
                </div>
                <div className='space-x-2'>
                    <button id='week' className={granularity === 7 ? 'bg-gray-300 p-2 rounded-2xl' : 'bg-white p-2 rounded-2xl'} onClick={() => changeGranularity(7)}>Past 7 Days</button>
                    <button id='cycle' className={granularity === 24 ? 'bg-gray-300 p-2 rounded-2xl' : 'bg-white p-2 rounded-2xl'} onClick={() => changeGranularity(24)}>Full Cycle</button>
                </div>
                {/*verticalView ? <VerticalGraph verticalRef={verticalRef} data={data}/> : <svg ref={horizontalGraphRef}></svg>*/}
                <svg ref={horizontalGraphRef}></svg>
            </div>
            <div className='flex-1 min-w-0'>
                <svg ref={cyclicTreeRef} width="100%" height="100%"></svg>
                <svg ref={treeRef} width="100%" height="100%"></svg>
            </div>
        </div>
    );

}
export default BubbleGraphs;
