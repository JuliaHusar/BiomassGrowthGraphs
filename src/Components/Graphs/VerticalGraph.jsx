import {useEffect} from "react";
import * as d3 from "d3";

const VerticalGraph = ({verticalRef, data, constraints}) => {

    useEffect(() => {
        const draw = () => {
            if (data.timeData.length === 0) return;

            const svg = d3.select(verticalRef.current);
            svg.selectAll("*").remove();
            svg
                .attr('width', constraints.width)
                .attr('height', constraints.height);

            const maxGap = 15 * 60 * 1000;

            const hasNext = new Set(
                data.timeData
                    .slice(0, -1)
                    .filter((d, i) => data.timeData[i + 1].timestamp - d.timestamp <= maxGap)
                    .map(d => d.timestamp)
            );
            hasNext.add(data.timeData.at(-1).timestamp);

            const x = d3.scaleUtc(d3.extent(data.timeData, d => d.timestamp), [constraints.marginLeft, constraints.width - constraints.marginRight]);
            // start y-axis from 300 to make vis larger and patterns clearer
            const y = d3.scaleLinear([300, d3.max(data.timeData, d => d.scd30_co2_ppm_input)], [constraints.height - constraints.marginTop, constraints.marginBottom])
            const r = d3.scaleLinear([0, d3.max(data.aggregatedData, d => Math.abs(d.delta))], [0, 30]).clamp(true);
            const line = d3.line()
                .defined(d => !isNaN(d.timestamp) && hasNext.has(d.timestamp))
                .x(d => x(d.timestamp))
                .y(d => y(d.scd30_co2_ppm_input));

            const outputLine = d3.line()
                .defined(d => !isNaN(d.timestamp) && hasNext.has(d.timestamp))
                .x(d => x(d.timestamp))
                .y(d => y(d.scd30_co2_ppm_output));

            const thresholdLine = d3.line()
                .x(d => x(d.timestamp))
                .y(d => y(400))

            // for formatting time format on x-axis
            const customTimeFormat = (date) => {
                if (d3.utcDay(date) < date) {
                    return d3.utcFormat("%-I %p")(date); // hour + am/pm
                } else { // at date boundaries
                    return d3.utcFormat("%b %-d")(date); // month + day
                }
            };

            // x axis
            svg.append("g")
                .attr("transform", `translate(0,${constraints.height - constraints.marginBottom})`)
                .call(
                    d3.axisBottom(x)
                        .ticks(d3.utcHour.every(3)) // ticks every 3 hours
                        // .ticks(width / 80)
                        .tickFormat(customTimeFormat)
                );

            // vertical line at date boundaries
            svg.append("g")
                .attr("transform", `translate(0,${constraints.height - constraints.marginBottom})`)
                .call(
                    d3.axisBottom(x)
                        .ticks(d3.utcDay) // ticks at day boundaries
                        .tickSize(-(constraints.height - constraints.marginTop - constraints.marginBottom)) // extend tick upward
                        .tickFormat("") // hide tick labels
                )
                .call(g => g.select(".domain").remove()) // remove axis line
                .call(g => g.selectAll(".tick line")
                    .attr("stroke", "black")
                    .attr("stroke-opacity", 0.06)
                    .attr("stroke-width", 2.5)
                );

            // tree graph for a day
            svg.append("g")
                .attr("transform", `translate(${constraints.width - constraints.marginRight}, 0)`)
                .call(d3.axisLeft(y).ticks(constraints.height / 50)) // reduce number of ticks
                .call(g => g.select(".domain").remove())
                .call(g => g.selectAll(".tick").clone()
                    .attr("x2", constraints.width - constraints.marginLeft - constraints.marginRight)
                    .attr("stroke-opacity", 0.1))

            svg.append("g")
                .attr("transform", `translate(${constraints.marginLeft},0)`)
                .call(d3.axisLeft(y).ticks(constraints.height / 50)) // reduce number of ticks
                .call(g => g.select(".domain").remove())
                .call(g => g.selectAll(".tick").clone()
                    .attr("x2", constraints.width - constraints.marginLeft - constraints.marginRight)
                    .attr("stroke-opacity", 0.1))

            svg.append("path")
                .attr("fill", "none")
                .attr("clip-path", "url(#clip)")
                .attr("stroke", "#62a247")
                .attr("stroke-width", 1)
                .attr("d", line(data.timeData));

            svg.append("path")
                .attr("fill", "none")
                .attr("clip-path", "url(#clip)")
                .attr("stroke", "#9FBC93")
                .attr("stroke-width", 1)
                .attr("d", outputLine(data.timeData));

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
                .attr("x", constraints.marginLeft)
                .attr("y", constraints.marginTop)
                .attr("width", constraints.width - constraints.marginLeft - constraints.marginRight)
                .attr("height", constraints.height - constraints.marginTop - constraints.marginBottom);

        }
        draw();
    }, [data]);

    return(
        <div>
            <svg ref={verticalRef} width="100%" height="100%"></svg>
        </div>
    )
}
export default VerticalGraph;