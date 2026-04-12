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
    const weeklyConstraints = {width: 2000, height: 500, marginTop:20, marginRight: 30, marginBottom: 30, marginLeft: 40}
    const cycleConstraints = {width: 2000, height: 200, marginTop:20, marginRight: 30, marginBottom: 30, marginLeft: 40}
    const [data, setData] = useState({ timeData: [], aggregatedData: [] });
    const cycleMap = new Map().set("Cycle 1", [new Date("03/05/2026"), new Date("03/28/2026")])
    const maxGap = 15 * 60 * 1000;
    const isInitialRender = useRef(true);

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
                const response = await fetch ('/04-10-2026.csv')
                const text = await response.text();

                Papa.parse(text, {
                    complete: (results) => {
                        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                        const timeData = results.data
                            .map(d => ({ ...d, timestamp: new Date(d.timestamp) }))
                            .filter(d => d.timestamp >= cutoff)
                            .filter(d => d.scd30_co2_ppm_input != 0)
                            .filter(d => d.scd30_co2_ppm_output != 0)
                        const preparedData = timeData.filter((val) => new Date(val.timestamp).getHours() != 16 && new Date(val.timestamp).getDate() != 3).reduce((accumulator, val) => {
                            //using hour key here, we don't want the first hour bcs offset can give us problems
                            //TODO: fix bug that could exclude certain hours that don't have a hh:mm for 00
                            const hourKey = new Date(val.timestamp);
                            hourKey.setMinutes(0, 0, 0, 0);
                            const k = hourKey.toISOString();
                            if (!accumulator[k]) accumulator[k] = { timestamp: hourKey, sum: 0, count: 0, output: [] };
                            accumulator[k].sum += val.scd30_co2_ppm_input - val.scd30_co2_ppm_output;
                            accumulator[k].output.push(parseInt(val.scd30_co2_ppm_input))
                            accumulator[k].count++;

                            return accumulator;
                        }, {});
                        const aggregatedData = Object.values(preparedData).map(({ timestamp, sum, count, output }) => ({
                            timestamp,
                            delta: sum / count,
                            output: output[output.length % 2]
                        }));
                        setData({ timeData, aggregatedData });
                    },
                    header: true,
                    dynamicTyping: true,
                })
            } catch (error) {
                console.log(error)
            }
        }
        getCSV();
    }, []);

    const r = useMemo(() => {
        if (!data.aggregatedData.length) return null;
        return d3.scaleLinear([0, d3.max(data.aggregatedData, d => Math.abs(d.delta))], [0, 30]).clamp(true);
    }, [data.aggregatedData]);

    const scales = useMemo(() => {
        if (data.timeData.length === 0) return;


        const hasNext = new Set(
            data.timeData
                .slice(0, -1)
                .filter((d, i) => data.timeData[i + 1].timestamp - d.timestamp <= maxGap)
                .map(d => d.timestamp)
        );
        hasNext.add(data.timeData.at(-1).timestamp);

        const x = d3.scaleUtc(d3.extent(data.timeData, d => d.timestamp), [weeklyConstraints.marginLeft, weeklyConstraints.width - weeklyConstraints.marginRight]);
        // start y-axis from 300 to make vis larger and patterns clearer
        const y = d3.scaleLinear([300, d3.max(data.timeData, d => d.scd30_co2_ppm_input)], [weeklyConstraints.height - weeklyConstraints.marginTop, weeklyConstraints.marginBottom])
        const line = d3.line()
            .defined(d => !isNaN(d.timestamp) && hasNext.has(d.timestamp))
            .x(d => x(d.timestamp))
            .y(d => y(d.scd30_co2_ppm_input))


        const outputLine = d3.line()
            .defined(d => !isNaN(d.timestamp) && hasNext.has(d.timestamp))
            .x(d => x(d.timestamp))
            .y(d => y(d.scd30_co2_ppm_output))

        const thresholdLine = d3.line()
            .x(d => x(d.timestamp))
            .y(d => y(1000))

        // for formatting time format on x-axis
        return { x, y, r, line, outputLine, thresholdLine };
    }, [data.timeData, weeklyConstraints.marginLeft, weeklyConstraints.width, weeklyConstraints.marginRight, weeklyConstraints.height, weeklyConstraints.marginTop, weeklyConstraints.marginBottom, r, maxGap]);

    useEffect(() => {
        if (!scales) return;
        if (!horizontalGraphRef.current) return;

        const draw = () => {
            const { x, y, r, line, outputLine, thresholdLine } = scales;
            const svg = d3.select(horizontalGraphRef.current);
            svg.selectAll("*").remove();
            svg
                .attr('width', weeklyConstraints.width)
                .attr('height', weeklyConstraints.height);

            // x axis
            svg.append("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0,${weeklyConstraints.height - weeklyConstraints.marginBottom})`)
                .call(
                    d3.axisBottom(x)
                        .ticks(d3.utcHour.every(3)) // ticks every 3 hours
                        // .ticks(width / 80)
                        .tickFormat(customTimeFormat)
                );

            // vertical line at date boundaries
            svg.append("g")
                .attr("transform", `translate(0,${weeklyConstraints.height - weeklyConstraints.marginBottom})`)
                .call(
                    d3.axisBottom(x)
                        .ticks(d3.utcDay) // ticks at day boundaries
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
            svg.append("g")
                .attr('class', 'y-axis')
                .attr("transform", `translate(${weeklyConstraints.marginLeft},0)`)
                .call(g => g.select(".domain").remove())
                .call(g => g.selectAll(".tick").clone()
                    .attr("x2", weeklyConstraints.width - weeklyConstraints.marginLeft - weeklyConstraints.marginRight)
                    .attr("stroke-opacity", 0.1))
                .call(d3.axisLeft(y).ticks(weeklyConstraints.height / 50)) // reduce number of ticks


            svg.append("path")
                .attr("fill", "none")
                .attr("clip-path", "url(#clip)")
                .attr("stroke", "#62a247")
                .attr("stroke-width", 1)
                .attr("d", line(data.timeData))
                .attr("class", "input-line")

            svg.append("path")
                .attr("fill", "none")
                .attr("clip-path", "url(#clip)")
                .attr("stroke", "#9FBC93")
                .attr("stroke-width", 1)
                .attr("d", outputLine(data.timeData))
                .attr("class", "output-line")

            svg.append("path")
                .attr("fill", "none")
                .attr("clip-path", "url(#clip)")
                .attr("stroke", "black")
                .style("stroke-dasharray", "2, 2")
                .attr("stroke-width", 0.6)
                .attr("opacity", 0.7)
                .attr("d", thresholdLine(data.timeData));

            svg.append("g")
                .selectAll("circle")
                .data(data.aggregatedData)
                .join("circle")
                .attr("cx", d => x(d.timestamp))
                .attr("cy", d => y(d.output))
                .attr("r", d => r(d.delta))
                .attr("fill", "#5bb335")
                .attr("opacity", 0.7)


            svg.append("defs").append("clipPath")
                .attr("id", "clip")
                .append("rect")
                .attr("x", weeklyConstraints.marginLeft)
                .attr("y", weeklyConstraints.marginTop)
                .attr("width", weeklyConstraints.width - weeklyConstraints.marginLeft - weeklyConstraints.marginRight)
                .attr("height", weeklyConstraints.height - weeklyConstraints.marginTop - weeklyConstraints.marginBottom);

        }
        draw();

    }, [data, scales, verticalView, weeklyConstraints.width, weeklyConstraints.height, weeklyConstraints.marginBottom, weeklyConstraints.marginTop, weeklyConstraints.marginLeft, weeklyConstraints.marginRight]);

    useEffect(() => {
        if (!scales || !horizontalGraphRef.current) return;

        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }
        const svg = d3.select(horizontalGraphRef.current);

        const constraints = granularity === 24 ? cycleConstraints : weeklyConstraints;

        const newY = d3.scaleLinear(
            [300, d3.max(data.timeData, d => d.scd30_co2_ppm_input)],
            [constraints.height - constraints.marginTop, constraints.marginBottom]
        );
        const x = d3.scaleUtc(d3.extent(data.timeData, d => d.timestamp), [weeklyConstraints.marginLeft, weeklyConstraints.width - weeklyConstraints.marginRight]);
        const transitionR = d3.scaleLinear(
            [0, d3.max(data.aggregatedData, d => Math.abs(d.delta))],
            [0, granularity === 24 ? 8 : 30]
        ).clamp(true);
        const hasNext = new Set(
            data.timeData
                .slice(0, -1)
                .filter((d, i) => data.timeData[i + 1].timestamp - d.timestamp <= maxGap)
                .map(d => d.timestamp)
        );
        hasNext.add(data.timeData.at(-1).timestamp);

        const newLine = d3.line()
            .defined(d => !isNaN(d.timestamp) && hasNext.has(d.timestamp))
            .x(d => x(d.timestamp))
            .y(d => newY(d.scd30_co2_ppm_input))


        const newOutputLine = d3.line()
            .defined(d => !isNaN(d.timestamp) && hasNext.has(d.timestamp))
            .x(d => x(d.timestamp))
            .y(d => newY(d.scd30_co2_ppm_output))

        const newThresholdLine = d3.line()
            .x(d => x(d.timestamp))
            .y(d => newY(1000))

        const t = svg.transition().duration(500);

        t.attr('height', constraints.height);

        svg.select(".x-axis").transition(t)
            .attr("transform", `translate(0,${constraints.height - constraints.marginBottom})`);

        svg.select(".y-axis").transition(t)
            .call(d3.axisLeft(newY).ticks(constraints.height / 50));

        svg.select(".input-line").transition(t)
            .attr("d", newLine(data.timeData));

        svg.select(".output-line").transition(t)
            .attr("d", newOutputLine(data.timeData));

        svg.select(".threshold-line").transition(t)
            .attr("d", newThresholdLine(data.timeData));

        svg.selectAll("circle").transition(t)
            .attr("cy", d => newY(d.output))
            .attr("r", d => transitionR(d.delta));

    }, [granularity, scales, data, cycleConstraints, weeklyConstraints, maxGap, r]);

    useEffect(() => {
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

            const treeGroup = svg.append("g")
                .attr("width", 100)
                .attr("height", 100)

            var treeLine = d3.line()
                .x((p) => p.x)
                .y((p) => p.y)
                .curve(d3.curveBumpX)
                .curve(d3.curveBumpY)

            svg.append("path")
                .attr("d", treeLine(treeLineData))
                .attr("fill", "none")
                .attr("stroke", "brown");

            const r = d3.scaleLinear([0, d3.max(data.aggregatedData, d => Math.abs(d.delta))], [0, 30]).clamp(true)
            const pack = d3.pack()
                .size([treeWidth - weeklyConstraints.marginLeft * 6, weeklyConstraints.height - weeklyConstraints.marginTop * 6])
                .radius(d => r(d.value))
                .padding(4);
            const filteredDays = data.aggregatedData.filter((day) => (new Date(day.timestamp).getUTCDate()) === new Date("April 04, 2026").getUTCDate())


            const root = pack(d3.hierarchy({ children: data.aggregatedData })
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
            const secondTickStart = clockRadius - 20;
            const secondTickLength = -10;
            const labelRadius = clockRadius + 16;
            const secondLabelYOffset = 5;
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

            const r = d3.scaleLinear([0, d3.max(data.aggregatedData, d => Math.abs(d.delta))], [0, 30]).clamp(true)
            const filteredDays = data.aggregatedData.filter((day) => (new Date(day.timestamp).getDate()) === new Date("April 08, 2026").getDate())
            console.log(filteredDays)


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
    }, [weeklyConstraints.height, weeklyConstraints.marginLeft, weeklyConstraints.marginTop, data]);

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
                    <button id='cycle' className={granularity === 24 ? 'bg-gray-300 p-2 rounded-2xl' : 'bg-white p-2 rounded-2xl'} onClick={() => changeGranularity(24)}>Cycle</button>
                </div>
                {verticalView ? <VerticalGraph verticalRef={verticalRef} data={data} constraints={weeklyConstraints}/> : <svg ref={horizontalGraphRef}></svg>}
            </div>
            <div className='flex-1 min-w-0'>
                <svg ref={cyclicTreeRef} width="100%" height="100%"></svg>
                <svg ref={treeRef} width="100%" height="100%"></svg>
            </div>
        </div>
    );

}
export default BubbleGraphs;
