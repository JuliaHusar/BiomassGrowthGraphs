import * as d3 from "d3";
import {customTimeFormat} from "../Components/Math/HelperFunctions.js";

export const drawHorizontal = (weeklyConstraints, scales, horizontalGraphRef, airData, lightData, selectedDaypartRef) => {
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



    //y axis
    g.append("g")
        .attr('class', 'y-axis')
        .attr("transform", `translate(${weeklyConstraints.marginLeft},0)`)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick").clone()
            .attr("x2", weeklyConstraints.width - weeklyConstraints.marginLeft - weeklyConstraints.marginRight)
            .attr("stroke-opacity", 0.1))
        .call(d3.axisLeft(y).ticks(weeklyConstraints.height / 50)) // reduce number of ticks

    // y axis label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -3)
        .attr("x", 0 - (weeklyConstraints.height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "11px")
        .text("Carbon Dioxide Concentration (ppm)");

    const dayKeys = [...new Set(lightData.aggregatedData.map(d => d.timestamp.toISOString().slice(0, 10)))];

    const lightY = d3.scaleLinear()
        .domain([0, d3.max(lightData.aggregatedData, d => d.light_in)])
        .range([weeklyConstraints.marginBottom, weeklyConstraints.height -  weeklyConstraints.marginTop - 350]);
    const color = d3.scaleLog().domain([d3.min(lightData.aggregatedData, d=> d.light_in),d3.max(lightData.aggregatedData, d => d.light_in)])
        .range(["#FFF8E1", "#FFECB3", "#FFE082", "#FFD54F", "#FFCA28"])
    dayKeys.forEach(day => {
        const dayRecords = lightData.aggregatedData.filter(d => d.timestamp.toISOString().slice(0, 10) === day);
        g.append("g")
            .attr("class", `light-day`)
            .selectAll("rect")
            .data(dayRecords)
            .join("rect")
            .attr("x", d => x(d.timestamp))
            .attr("y", y.range()[1]) // full height of y axis
            .attr("width", weeklyConstraints.width / 24)
            .attr("height", weeklyConstraints.height - weeklyConstraints.marginTop - weeklyConstraints.marginBottom)
            .attr("fill", d => color(d.light_in))
            .attr("opacity", 0.5)
            .attr("clip-path", "url(#clip)")
            .attr("pointer-events", "none");
    });

    // vertical line at date boundaries
    g.append("g")
        .attr("transform", `translate(0,${weeklyConstraints.height - weeklyConstraints.marginBottom})`)
        .attr("class", "vertical-line")
        .call(
            d3.axisBottom(x)
                .ticks(d3.utcHour.every(24)) // ticks at day boundaries
                .tickSize(-(weeklyConstraints.height - weeklyConstraints.marginTop - weeklyConstraints.marginBottom)) // extend tick upward
                .tickFormat("") // hide tick labels
        )
        .call(g => g.select(".domain").remove()) // remove axis line
        .call(g => g.selectAll(".tick line")
            .attr("stroke", "black")
            .attr("stroke-opacity", 0.06)
            .attr("stroke-width", 2.5)
        );

    g.append("path")
        .attr("class", "input-data")
        .attr("fill", "none")
        .attr("clip-path", "url(#clip)")
        .attr("stroke", "#62a247")
        .attr("stroke-width", 1)
        .attr("d", line(airData.weeklyData))
        .attr("class", "input-line")

    g.append("path")
        .attr("class", "output-data")
        .attr("fill", "none")
        .attr("clip-path", "url(#clip)")
        .attr("stroke", "#9FBC93")
        .attr("stroke-width", 1)
        .attr("d", outputLine(airData.weeklyData))
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
        .data(airData.aggregatedWeeklyData)
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
    let mouseover = function (d) {
        d3.select(this)
            .style("stroke", "black")
            .style("opacity", 1)
        // console.log(d.target.__data__)
    }
    let mouseleave = function (event, d) {
        if (!selectedDaypartRef.current.includes(d.toISOString())) {
            tooltip
                .style("opacity", 0)
            d3.select(this)
                .style("stroke", "none")
                .style("opacity", 0.8)
        }
    }
    const tickValues = x.ticks(d3.utcHour.every(1));
    const tooltipRect = g.append("g")
        .attr("transform", `translate(-25, 0)`)
        .attr("class", "daypartRect")
        .selectAll("rect")
        .data(tickValues.map((d) => new Date(d))) //there's so weird timezone fuckery happening
        .join("rect")
        .attr("class", d => d)
        .attr("x", d => x(d))
        .attr("y", weeklyConstraints.marginTop)
        .attr("width", (d, i) => x(tickValues[i + 1]) - x(d))
        .attr("height", weeklyConstraints.height - weeklyConstraints.marginTop - weeklyConstraints.marginBottom)
        .attr("fill", () => "rgba(0,0,0,0)")
        .on("mouseover", mouseover)
        .on("mouseleave", mouseleave)

    return {tooltipRect}
}