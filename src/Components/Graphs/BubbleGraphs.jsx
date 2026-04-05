import {useEffect, useRef, useState} from "react";
import Papa from "papaparse";
import * as d3 from 'd3';
import {convertToDate} from "../Math/HelperFunctions.js";

const HourOverTimeCo2 = () => {
    const ref = useRef();
    const width = 2000;
    const height = 1000;
    const marginTop = 20;
    const marginRight = 30;
    const marginBottom = 30;
    const marginLeft = 40;
    const [data, setData] = useState({ timeData: [], aggregatedData: [] });

    const [detailDate, setDetailDate] = useState('');

    useEffect(() => {
        const getCSV = async () => {
            try{
                const response = await fetch ('/2026-data.csv')
                const text = await response.text();

                Papa.parse(text, {
                    complete: (results) => {
                        const cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
                        const timeData = results.data
                            .map(d => ({ ...d, timestamp: new Date(d.timestamp) }))
                            .filter(d => d.timestamp >= cutoff)
                            .filter(d => d.scd30_co2_ppm_input != 0)
                            .filter(d => d.scd30_co2_ppm_output != 0)
                        const preparedData = timeData.filter((val) => new Date(val.timestamp).getHours() != 16 && new Date(val.timestamp).getDate() != 3).reduce((accumulator, val) => {
                            //using hour key here, we don't want the first hour bcs offset can give us problems
                            const hourKey = new Date(val.timestamp);
                            hourKey.setMinutes(0, 0, 0, 0);
                            const k = hourKey.toISOString();
                            if (!accumulator[k]) accumulator[k] = {timestamp: hourKey, sum: 0, count: 0, output: []};
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
                    header:true,
                    dynamicTyping: true,
                });
            } catch (error){
                console.log(error)
            }
        }
        getCSV();
    }, []);

    useEffect(() => {
        if (data.timeData.length === 0) return;

        const svg = d3.select(ref.current);
        svg.selectAll("*").remove();
        svg
            .attr('width', width)
            .attr('height', height);

        const maxGap = 15 * 60 * 1000;

        const hasNext = new Set(
            data.timeData
                .slice(0, -1)
                .filter((d, i) => data.timeData[i + 1].timestamp - d.timestamp <= maxGap)
                .map(d => d.timestamp)
        );
        hasNext.add(data.timeData.at(-1).timestamp);

        const x = d3.scaleUtc(d3.extent(data.timeData, d => d.timestamp), [marginLeft, width - marginRight]);
        const y = d3.scaleLinear([0, d3.max(data.timeData, d => d.scd30_co2_ppm_input)], [height - marginTop, marginBottom])


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

        //x axis
        svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(
                d3.axisBottom(x)
                    .ticks(width / 80)
            );

        //tree graph for a day
        svg.append("g")
            .attr("transform", `translate(${width - marginRight}, 0)`)
            .call(d3.axisLeft(y).ticks(height / 20))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick").clone()
                .attr("x2", width - marginLeft - marginRight)
                .attr("stroke-opacity", 0.1))

        svg.append("g")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y).ticks(height / 20))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick").clone()
                .attr("x2", width - marginLeft - marginRight)
                .attr("stroke-opacity", 0.1))

        svg.append("path")
            .attr("fill", "none")
            .attr("clip-path", "url(#clip)")
            .attr("stroke", "red")
            .attr("stroke-width", 1.5)
            .attr("d", line(data.timeData));

        svg.append("path")
            .attr("fill", "none")
            .attr("clip-path", "url(#clip)")
            .attr("stroke", "steelBlue")
            .attr("stroke-width", 1.5)
            .attr("d", outputLine(data.timeData));

        svg.append("path")
            .attr("fill", "none")
            .attr("clip-path", "url(#clip)")
            .attr("stroke", "steelBlue")
            .attr("stroke-width", 1.5)
            .attr("d", thresholdLine(data.timeData));

        svg.append("g")
            .selectAll("circle")
            .data(data.aggregatedData)
            .join("circle")
            .attr("cx", d => x(d.timestamp))
            .attr("cy", d => y(d.output))
            .attr("r", d => d.delta)
            .attr("fill", "green")
            .attr("opacity", 0.5)


        svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("x", marginLeft)
            .attr("y", marginTop)
            .attr("width", width - marginLeft - marginRight)
            .attr("height", height - marginTop - marginBottom);
    }, [data]);

    return (
        <div className='overflow-scroll'>
            <svg ref={ref}></svg>
        </div>
    );

}
export default HourOverTimeCo2;
