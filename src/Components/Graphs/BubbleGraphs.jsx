import {useEffect, useMemo, useRef, useState} from "react";
import Papa from "papaparse";
import * as d3 from 'd3';
import VerticalGraph from "./VerticalGraph.jsx";
import {cleanUp, filterWeekData} from "../Math/HelperFunctions.js";
import DataViewer from "../DataViewer.jsx";
import {drawStandardTree, drawCyclicTree} from "../../TreeDrawing.js";
import {getAirQuality, getLightData} from "../../LoadData.js";
import {drawHorizontal} from "../../DrawHorizontal.js";
import {drawVertical} from "../../DrawVertical.js";
import {drawLegend} from "../../DrawLegend.js";

const BubbleGraphs = () => {
    const horizontalGraphRef = useRef();
    const treeRef = useRef();
    const verticalRef = useRef();
    const cyclicTreeRef = useRef();
    const legendRef = useRef(); // for legend

    //TODO: filter out any data where output is higher than input
    //TODO: add maintenance for any data that is null :)

    //selectedView
    const [verticalView, setVerticalView] = useState(false);
    const [granularity, setGranularity] = useState(7); // granularity is being set in terms of days. we can start with 7 and then expand as needed
    const [airData, setAirData] = useState({ timeData: [], deltaEncoding: [], weeklyData: [], aggregatedWeeklyData: [], fifteenMinuteAirQualityAggregation: [], aggregatedDayPartDelta: [] });
    const [lightData, setLightData] = useState({aggregatedData: [], cycleAggregatedData: []});
    const [selectedDaypart, setSelectedDaypart] = useState([])
    const [selectedWeekPart, setSelectedWeekPart] = useState([])

    //  const cycleMap = new Map().set("Cycle 1", [new Date("03/05/2026"), new Date("03/28/2026")])
    const maxGap = 30 * 60 * 1000; //this value must align with whatever the aggregation interval is for the result var. idk why
    const selectedDaypartRef = useRef(selectedDaypart);
    const selectedWeekPartRef = useRef(selectedWeekPart);

    const customTimeFormat = (date) => {
        if (d3.utcDay(date) < date) {
            return d3.utcFormat("%-I %p")(date); // hour + am/pm
        } else { // at date boundaries
            return d3.utcFormat("%b %-d")(date); // month + day
        }
    };

    useEffect(() => {
        getAirQuality().then((r) => setAirData(r))
        getLightData().then((r) => setLightData(r))
    }, []);

    const scales = useMemo(() => {
        if (airData.timeData.length === 0) return;
        const weeklyConstraints = {width: 1000, height: 500, marginTop:20, marginRight: 30, marginBottom: 30, marginLeft: 40}
        const hasNext = new Set(
            airData.weeklyData
                .slice(0, -1)
                .filter((d, i) => airData.weeklyData[i + 1].timestamp - d.timestamp <= maxGap)
                .map(d => d.timestamp)
        );
        hasNext.add(airData.weeklyData.at(-1).timestamp);

        const x = d3.scaleUtc(d3.extent(airData.weeklyData, d => d.timestamp), [weeklyConstraints.marginLeft, weeklyConstraints.width - weeklyConstraints.marginRight]);
        // start y-axis from 300 to make vis larger and patterns clearer
        const y = d3.scaleLinear([350, d3.max(airData.weeklyData, d => d.scd30_co2_ppm_input)], [weeklyConstraints.height - weeklyConstraints.marginTop, weeklyConstraints.marginBottom])
        // encode delta with circle area
        const r = d3.scaleSqrt([0, d3.max(airData.deltaEncoding, d => Math.abs(d.delta))], [0, 12]).clamp(true);
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
    }, [airData.timeData.length, airData.weeklyData, airData.deltaEncoding, maxGap]);

    useEffect(() => {
        if (!scales) return;
        if (!horizontalGraphRef.current) return;
        if (granularity === 24) return;
        const weeklyConstraints = {width: 1000, height: 500, marginTop:20, marginRight: 30, marginBottom: 30, marginLeft: 40}

        const draw = () => {
            const {tooltipRect} = drawHorizontal(weeklyConstraints, scales, horizontalGraphRef, airData, lightData, selectedDaypartRef)

            //TODO: fix bug in selector that selects four hours minus
                tooltipRect
                .on("click", function (event, d) {
                    const ts = d.toISOString();
                    const next = selectedDaypartRef.current.includes(ts)
                        ? selectedDaypartRef.current.filter(t => t !== ts)
                        : [...selectedDaypartRef.current, ts]

                    selectedDaypartRef.current = next
                    setSelectedDaypart(next)
                })
        }
        !verticalView ? draw() : drawVertical(airData, horizontalGraphRef, lightData, customTimeFormat)
    }, [airData, scales, granularity, verticalView, lightData]);

    useEffect(() => {
        if (!horizontalGraphRef.current) return;
        const svg = d3.select(horizontalGraphRef.current);

        svg.selectAll(".daypartRect rect")
            .classed("selected", false)
            .attr("fill", "rgba(0,0,0,0)")
            .style("stroke", "none")
            .style("opacity", 0.8)
        if(granularity === 7){
            if (selectedDaypartRef.current.length > 0 && selectedDaypartRef.current.length < 3) {
                svg.selectAll(".daypartRect rect")
                    .filter(d => selectedDaypart.includes(d.toISOString()))
                    .classed("selected", true)
                    .attr("fill", "rgba(255,255,0,0.2)")
                    .style("stroke", "black")
                    .style("stroke-width", "2px")
                    .style("opacity", 1)
                svg.select(".selected-area").remove()

            } else if (selectedDaypartRef.current.length >= 3) {
                const next = selectedDaypartRef.current.slice(1);
                selectedDaypartRef.current = next;
                setSelectedDaypart(next);
            }
            if (selectedDaypartRef.current.length === 2) {
                svg.selectAll(".selected-area").remove();
                const {filteredData, start, end} = filterWeekData(selectedDaypartRef, airData.weeklyData)
                if (filteredData.length === 0) return;
                const { x } = scales;

                const constraints = { height: 500, marginTop: 20, marginBottom: 30 };
                svg.select(".first-group")
                    .append("rect")
                    .attr("class", "selected-area")
                    .attr("x", x(start)-20)
                    .attr("y", constraints.marginTop)
                    .attr("width", x(end) - x(start))
                    .attr("height", constraints.height - constraints.marginTop - constraints.marginBottom)
                    .attr("fill", "rgba(255, 200, 0, 0.15)")
                    .attr("stroke", "orange")
                    .attr("stroke-width", 1)
                    .attr("pointer-events", "none");
            }
        } else {
                svg.selectAll(".calendarPartRect rect")
                    .filter(d => selectedWeekPart.includes(d.toISOString()))
                    .classed("selected", true)
                    .attr("fill", "rgba(255,255,0,0.2)")
                    .style("stroke", "black")
                    .style("stroke-width", "2px")
                    .style("opacity", 1)
                svg.selectAll(".selected-cycle-area").remove();
                const {filteredData, start, end} = filterWeekData(selectedDaypartRef, airData.timeData)
                if (filteredData.length === 0) return;
                const { x, y } = scales;
            const constraints = { height: 500, marginTop: 20, marginBottom: 30 };
                svg.select(".light-day")
                    .append("rect")
                    .attr("class", "selected-cycle-area")
                    .attr("x", x(start)-20)
                    .attr("y", constraints.marginTop)
                    .attr("width", x(end) - x(start))
                    .attr("height", constraints.height - constraints.marginTop - constraints.marginBottom)
                    .attr("fill", "rgba(255, 200, 0, 0.15)")
                    .attr("stroke", "orange")
                    .attr("stroke-width", 1)
                    .attr("pointer-events", "none");
        }
    }, [airData.weeklyData, scales, selectedDaypart, granularity, selectedWeekPart, airData.timeData]);


    useEffect(() => {
        const cycleConstraints = {width: 1000, height: 200, marginTop:20, marginRight: 50, marginBottom: 50, marginLeft: 40}

        if (!scales || !horizontalGraphRef.current) return;
        if (airData.weeklyData.length === 0) return;
        if (granularity === 7) return;
        const weeklyConstraints = { width: 2000, height: 500, marginTop: 20, marginRight: 30, marginBottom: 30, marginLeft: 40 }
        const svg = d3.select(horizontalGraphRef.current);
        svg.select(".input-line").transition().remove();
        svg.select(".output-line").transition().remove();
        svg.selectAll(".daypartRect").remove();
        svg.selectAll(".light-day").remove();

        const constraints = granularity === 24 ? cycleConstraints : weeklyConstraints;
        const activeData = granularity === 24 ? airData.timeData : airData.weeklyData;
        const activeAggregated = granularity === 24 ? airData.aggregatedDayPartDelta : airData.aggregatedWeeklyData; //if cycle is selected we'll map the delta encoding for all 24 days

        const newY = d3.scaleLinear(
            [350, d3.max(activeData, d => d.scd30_co2_ppm_input)],
            [constraints.height - constraints.marginTop, constraints.marginBottom]
        );
        const x = d3.scaleUtc(d3.extent(activeData, d => d.timestamp), [weeklyConstraints.marginLeft, weeklyConstraints.width - weeklyConstraints.marginRight]);
        const filteredX = d3.scaleUtc(d3.extent(activeData, d => d.timestamp), [cycleConstraints.marginLeft, cycleConstraints.width - cycleConstraints.marginRight])
        const transitionR = d3.scaleSqrt(
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


        //full cycle visualization
        if(granularity === 24){
            cleanUp(svg)
            // we want to reset this so that when we're switching between views we can reuse the ref for the cycle stuff
            t.on("end", () => {

                svg.selectAll("circle").transition().remove();
                svg.select(".vertical-line").remove();
                const row = d3.scaleBand()
                    .domain([...weekBuckets.keys()])
                    .range([0, constraints.height * weekBuckets.size])
                    .padding(0.05)
                svg.attr("height", row.range()[1] + constraints.marginBottom);

                const cellContainer = svg.append('g').attr('class', 'cells')

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
                        [350, d3.max(activeData, d => d.scd30_co2_ppm_input)],
                        [row.bandwidth(), 0]
                    );
                    const r = d3.scaleSqrt([0, d3.max(activeAggregated, d => Math.abs(d.delta))], [0, 12]).clamp(true);

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
                        .range([constraints.marginBottom, constraints.height - constraints.marginTop + 400]);
                    const color = d3.scaleLog().domain([d3.min(lightData.cycleAggregatedData, d => d.light_in), d3.max(lightData.cycleAggregatedData, d => d.light_in)])
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

                    let mouseover = function (d) {
                        d3.select(this)
                            .style("stroke", "black")
                            .style("opacity", 1)
                        // console.log(d.target.__data__)
                    }
                    let mouseleave = function(event, d) {
                        if(!selectedWeekPartRef.current.includes(d.toISOString())){
                            tooltip
                                .style("opacity", 0)
                            d3.select(this)
                                .style("stroke", "none")
                                .style("opacity", 0.8)
                        }
                    }

                    let tooltip = d3.selectAll(".calendarPartRect")
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
                        .on("click", function(event, d){
                            const ts = d.toISOString();
                            const next = selectedWeekPartRef.current.includes(ts)
                                ? selectedWeekPartRef.current.filter(t => t !== ts)
                                : [...selectedWeekPartRef.current, ts]
                            selectedWeekPartRef.current = next
                            setSelectedWeekPart(next)
                        })
                });
            });

        } else {
            svg.selectAll(".cells").transition().remove();
            svg.selectAll(".day-clip").transition().remove();
        }
    }, [airData.deltaEncoding, airData.aggregatedWeeklyData, airData.timeData, airData.weeklyData, granularity, maxGap, scales, airData.aggregatedDayPartDelta, lightData]);

    //logic for drawing trees
    useEffect(() => {
        const weeklyConstraints = {width: 2000, height: 500, marginTop:20, marginRight: 30, marginBottom: 30, marginLeft: 40}
        if(selectedDaypart.length === 2){
            const {start, end} = filterWeekData(selectedDaypartRef, airData.weeklyData)
            drawCyclicTree(cyclicTreeRef, airData.deltaEncoding.filter((d) => d.timestamp > start && d.timestamp < end))
        }
        drawStandardTree(treeRef, airData, weeklyConstraints)
    }, [airData, selectedWeekPartRef, selectedDaypart]);

    const changeGranularity = (val) => {
        //we're starting on 7 days so the granularity change should start from that state
        setGranularity(val)
    }

    // for legend
    useEffect(() => {
        drawLegend(legendRef, airData, lightData)
    }, [airData, lightData]);

    return (
        <div className='flex flex-row w-full h-full gap-4'>
            {/* left col */}
            <div className='flex flex-col w-7/12 min-w-0'>
                {/* legend */}
                <div className='self-start w-fit flex justify-center items-center'>
                    <svg ref={legendRef}></svg>
                </div>
                {/* timeline vis */}
                <div className=' overflow-x-scroll'>
                    <div>
                        <button id='horizontal' className={'p-2'} onClick={() => setVerticalView(false)}>Horizontal</button>
                        <button id='vertical' className={'p-2'} onClick={() => setVerticalView(true)}>Vertical</button>
                    </div>
                    <div className='space-x-2'>
                        <button id='week' className={granularity === 7 ? 'bg-gray-300 p-2 rounded-2xl' : 'bg-white p-2 rounded-2xl'} onClick={() => changeGranularity(7)}>Past 7 Days</button>
                        <button id='cycle' className={granularity === 24 ? 'bg-gray-300 p-2 rounded-2xl' : 'bg-white p-2 rounded-2xl'} onClick={() => changeGranularity(24)}>Full Cycle</button>
                    </div>
                    {/*verticalView ? <VerticalGraph verticalRef={verticalRef} data={data}/> : <svg ref={horizontalGraphRef}></svg>*/}
                    <div>
                        <svg ref={horizontalGraphRef}></svg>
                        <div>
                            <DataViewer selectedDaypartRef={selectedDaypartRef} data={airData} granularity={granularity} selectedWeekPartRef={selectedWeekPartRef} />
                        </div>
                    </div>
                </div>
            </div>
            {/* right col */}
            <div className='w-2/5 flex flex-col'>
                <div className='p-4 space-y-4'>
                    {/* <p className='text-left text-gray-800 text-lg'>
                        One Bio-Blade provides annual carbon removal equivalent to <strong>one maple tree</strong>.
                        The 12 Bio-Blades at the Innovation Barn are therefore equivalent to <strong>12</strong>
                        maple trees, or <strong>0.7 acres</strong> of maple-tree planting area.
                    </p> */}
                    <p className='text-left text-gray-800 text-lg'>
                        Select a time range on the timeline to see the net carbon removal during this period visualized in the trees.
                    </p>
                </div>
                <div className='overflow-scroll'>
                    <svg width="100%" height="100%" ref={cyclicTreeRef}></svg>
                </div>
            </div>

    </div>
);

}
export default BubbleGraphs;
