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
                .attr('height', constraints.height + 2000);

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
            let dayBuckets = d3.group(
                data.timeData,
                d => new Date(d.timestamp).toISOString().slice(0, 10)
            );

            // x axis
            /*
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

             */

            // what if we had like a sort of look up container where people could choose a date that they wanted to compare??? if we're really looking at user needs here

            const row = d3.scaleBand()
                .domain([...dayBuckets.keys()])
                .range([constraints.marginLeft, constraints.width - constraints.marginRight])
                .padding(0.05);


            const cellContainer = svg.append('g').attr('class', 'cells');

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
                .attr("width", 2000)
                .attr("height", constraints.height - constraints.marginTop - constraints.marginBottom);

            cells.each(function([day, records]) {
                const cell = d3.select(this);
                const bandwidth = 2000;

                const dayStart = new Date(day + "T00:00:00Z");
                const dayEnd   = new Date(day + "T24:00:00Z");

                const xLocal = d3.scaleUtc()
                    .domain([dayStart, dayEnd])
                    .range([0, bandwidth]);

                const localHasNext = new Set(
                    records.slice(0, -1)
                        .filter((d, i) => records[i + 1].timestamp - d.timestamp <= maxGap)
                        .map(d => d.timestamp)
                );
                localHasNext.add(records.at(-1).timestamp);

                const localLine = d3.line()
                    .defined(d => !isNaN(d.timestamp) && localHasNext.has(d.timestamp))
                    .x(d => xLocal(d.timestamp))
                    .y(d => y(d.scd30_co2_ppm_input));

                const localOutputLine = d3.line()
                    .defined(d => !isNaN(d.timestamp) && localHasNext.has(d.timestamp))
                    .x(d => xLocal(d.timestamp))
                    .y(d => y(d.scd30_co2_ppm_output));

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

                // Threshold line
                cell.append("line")
                    .attr("x1", 0)
                    .attr("x2", bandwidth)
                    .attr("y1", y(400))
                    .attr("y2", y(400))
                    .attr("stroke", "black")
                    .style("stroke-dasharray", "2,2")
                    .attr("stroke-width", 0.6)
                    .attr("opacity", 0.7);
            });

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