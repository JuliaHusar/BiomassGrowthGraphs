import {useEffect, useRef} from "react";
import * as d3 from "d3";
import {downloadSVG} from "../Math/HelperFunctions.js";

const UnitVis = ({historicData, width, height, margin}) => {
    const ref = useRef();

    useEffect(() => {
        if (historicData.length === 0) return;

        //data cleaning
        const dailyData = d3.group(historicData, d => {
            const date = new Date(d.LocalTime);
            return d3.timeDay(date).toISOString().split('T')[0];
        });
        const dailyArray = Array.from(dailyData, ([date, values]) => ({ date, values }));
        //svg init
        const svg = d3.select(ref.current)
            .attr('width', width)
            .attr('height', height);

        //const tooltip = d3.select('#tooltip');
        const dates = dailyArray.map(d => (d.date));

        const x = d3.scaleBand()
            .domain(dates.map(d => (d)))
            .range([margin.left, width - margin.right]);
        const y = d3.scaleLinear()
            .domain([0, 24])
            .range([margin.top, height - margin.bottom]);

        //create cells for graph
        const cellWidth = x.bandwidth();
        const cells = svg.selectAll('g.cell')
            .data(dailyArray)
            .enter()
            .append('g')
            .attr('class', 'cell')
            .attr('transform', d => `translate(${x(d.date)}, ${margin.top})`);
        const smallMargin = { top: 10, right: 10, bottom: 20, left: 30 };
        cells.each(function(d) {
            const cell = d3.select(this);
            //helper function to get maxCo2 at any point
            const maxCo2 = () => {
                return Math.max(
                    d3.max(historicData, d => d.Co2_In),
                    d3.max(historicData, d => d.Co2_Out)
                )
            }
            //x-axis to display lux values on path
            const luxAxis = d3.scaleLinear()
                .domain([0, d3.max(historicData, d => d.front_lux_values)])
                .range([smallMargin.left, cellWidth - smallMargin.right]);
            //x-axis used to display count
            const co2Axis = d3.scaleLinear()
                .domain([0, maxCo2()])
                .range([smallMargin.left, cellWidth - smallMargin.right]);
            //matches up with outerY scale
            const innerY = d3.scaleLinear()
                .domain([0, 24])
                .range([0, height - margin.bottom - margin.top]);
            //lux values that are plotted on the line, rn it's only getting front lux values
            // but we can change it to measure how much light is passing through bioreactor (the more carbon it sequesters, the less light goes through)
            const line = d3.line()
                .defined((d, i, data) => {
                    if (i === 0) return true;
                    const prev = new Date(data[i - 1].LocalTime);
                    const curr = new Date(d.LocalTime);
                    const diffHours = (curr - prev) / 1000 / 60 / 60;
                    return diffHours < 1;
                })
                .x(d => luxAxis(d.front_lux_values))
                .y(d => {
                    const t = new Date(d.LocalTime);
                    return innerY(t.getHours() + t.getMinutes() / 60);
                });
            /*
            displays y-axis for every individual cell, removed it bcs of clutter but we can always add it back
            cell.append('g')
                .attr('transform', `translate(${smallMargin.left}, 0)`)
                .call(d3.axisLeft(innerY)
                    .ticks(24)
                    .tickFormat(d => `${String(Math.floor(d)).padStart(2, '0')}:00`)
                )

             */
            //bins for yscale based on hour of day
            const binY = d3.scaleLinear()
                .domain([0, 24])
                .range([0, height - margin.top - margin.bottom]);
            //histogram for the co2 values with circles
            const histogram = d3.histogram()
                .value(d => {
                    const t = new Date(d.LocalTime);
                    return t.getHours() + t.getMinutes() / 60;
                })
                .domain([0, 24])
                .thresholds(d3.range(0, 24, 1));
            //get bin intervals based on co2 values
            //we can change this later to account for all co2 values if needed
            const bins = histogram(d.values.filter(v => v.Co2_In != null));
            //for every bin, create a dot count
            bins.forEach(timeBin => {
                if (timeBin.length === 0) return;

                const meanCo2In = d3.mean(timeBin, v => v.Co2_In);
                const meanCo2Out = d3.mean(timeBin, v => v.Co2_Out);
                const dotCountIn = Math.round(meanCo2In / 40); //40ppm represents one dot bcs trends are easier to see this way
                const dotCountOut = Math.round(meanCo2Out / 40);
                const r = 9; // increased radius
                //maps out dots for ever bin within the cell on the y-axis
                let difference = dotCountIn - dotCountOut

                /*
                d3.range(dotCountIn).forEach(i => {
                    cell.append("circle")
                        .attr("cx", smallMargin.left + r + i * (r * 2 + 2))
                        .attr("cy", binY((timeBin.x0 + timeBin.x1) / 2))
                        .attr("r", r)
                        .attr("fill", i >= dotCountOut ? "green" : "#E9ECEF") //
                        .attr("opacity", 1);
                });

                d3.range(dotCountOut).forEach(i => {
                    cell.append("circle")
                        .attr("cx", smallMargin.left + r + i * (r * 2 + 2))
                        .attr("cy", binY((timeBin.x0 + timeBin.x1 + 1) / 2))
                        .attr("r", r)
                        .attr("fill", "#E9ECEF") //difference is green
                        .attr("opacity", 1);
                });

                 */
                d3.range(dotCountIn).forEach(i => {
                    cell.append("circle")
                        .attr("cx", smallMargin.left + r + i * (r * 2 + 2))
                        .attr("cy", binY((timeBin.x0 + timeBin.x1) / 2))
                        .attr("r", r)
                        .attr("fill", "#E9ECEF") //
                        .attr("opacity", 1);
                });

                d3.range(difference).forEach(i => {
                    cell.append("circle")
                        .attr("cx", smallMargin.left + r + i * (r * 2 + 2))
                        .attr("cy", binY((timeBin.x0 + timeBin.x1) / 2))
                        .attr("r", r - 2) // so that the overall radius including the stroke = r
                        .attr("stroke", "#5bb335") // trying a shade of green that looks more like the microalgae
                        .attr("stroke-width", 4)
                        .attr("fill", "#E9ECEF") //sequestration is gray with green outline
                        .attr("opacity", 1);
                });


            });

            cell.append('g')
                .attr('transform', `translate(0, ${height - margin.top - margin.bottom})`)
                .call(d3.axisBottom(luxAxis).ticks(3).tickSizeInner(-6))
                .selectAll('text')
                .attr('text-anchor', 'end')
                .attr('dx', '1.5em')
                .attr('dy', '-1.5em')


            const n = 5;
            const dotsPerCircle = 100;
            const sampledData = d.values.filter((_, i) => i % n === 0);

            cell.selectAll("circle")
                .data(bins)
                .enter()

            cell.append('g')
                .selectAll("g.bin")
                .data(bins)
                .enter()
                .append("g")
                .attr("class", "bin")
            /* These are scatterplots of the points that form bands showing the input and output values
                        cell.append('g')
                            .selectAll("circle")
                            .data(d.values)
                            .enter()
                            .append("circle")
                            .attr("cx", v => co2Axis(v.Co2_In))
                            .attr("cy", v => {
                                const t = new Date(v.LocalTime);
                                return innerY(t.getHours() + t.getMinutes() / 60);
                            })
                            .attr("r", 2)
                            .attr("fill", "steelblue");

                        cell.append('g')
                            .selectAll("circle")
                            .data(d.values)
                            .enter()
                            .append("circle")
                            .attr("cx", v => co2Axis(v.Co2_Out))
                            .attr("cy", v => {
                                const t = new Date(v.LocalTime);
                                return innerY(t.getHours() + t.getMinutes() / 60);
                            })
                            .attr("r", 2)
                            .attr("fill", "red");

             */

            cell.append('path')
                .datum(sampledData)
                .attr('fill', 'none')
                .attr('stroke', '#e7d530')
                .attr('stroke-width', 1.5)
                .attr('d', line)
                .attr('opacity', 0.5); // reduce opacity

        })

        svg.append('g')
            .attr('transform', `translate(0, ${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(width / 80));


        svg.append('g')
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(d3.axisLeft(y)
                .ticks(24)
                .tickFormat(d => `${String(d).padStart(2, '0')}:00`)
            );

        downloadSVG(ref)
    }, [historicData, margin.bottom, margin.left, margin.right, margin.top]);
    return(
        <div className='overflow-scroll'>
            <svg ref={ref}></svg>
        </div>
    )
}

export default UnitVis