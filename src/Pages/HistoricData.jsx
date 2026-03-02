import * as d3 from 'd3';
import {useEffect, useRef, useState} from "react";
import Papa from "papaparse";
import '../App.css';
import {convertToDate, datesWithinRange, downloadSVG} from "../Components/Math/HelperFunctions.js";
import HourOverTimeCo2 from "../Components/Graphs/HourOverTimeCo2.jsx";

const HistoricData = () => {
    const ref = useRef();
    const [historicData, setHistoricData] = useState([]);
    const [rawCSV, setRawCSV] = useState(null)
    const [selectedData, setSelectedData] = useState(null);
    const width = 3000;
    const height = 900;
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    useEffect(() => {
        const getCSV = async () => {
            try{
                const response = await fetch ('/April25Cleaned.csv')
                /*
                const response = await axios.post('http://localhost:3000/api/getData',
                    {
                        sheetName: ["lux_in", "lux_out", "co2_in", "co2_out"]
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                 */
                const text = await response.text();
                setRawCSV(text)

                Papa.parse(text, {
                    complete: (results) => {
                        results.data.pop();
                        setHistoricData(results.data)
                    },
                    header:true,
                    dynamicTyping: true,
                });
            } catch (error){
                console.log(error)
            }
        }
        getCSV().then(console.log(historicData));
    }, []);


    /* Time Graph Showing Lux over x time
    useEffect(() => {
        if (historicData.length === 0) return;
        console.log(historicData);
        const time = historicData.map(d => convertToDate(d.LocalTime));
        const luxIn = historicData.map(d => d.front_lux_values);
        const co2In = historicData.map(d => d.Co2_In);

        const svg = d3.select(ref.current)
            .attr('width', width)
            .attr('height', height);

        const tooltip = d3.select('#tooltip');

        const x = d3.scaleBand()
            .domain(time)
            .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(historicData, d => d.Co2_In)]).nice()
            .range([height - margin.bottom, margin.top]);

        const radius = d3.scaleSqrt()
            .domain([0, d3.max(luxIn)])
            .range([0, 20]);

        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x));

        svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y));

        svg.selectAll('circle')
            .data(historicData)
            .enter()
            .append('circle')
            .attr('cx', d => x(convertToDate(d.LocalTime)) + x.bandwidth() / 2)
            .attr('cy', d => y(d.Co2_In))
            .attr('r', d => radius(d.front_lux_values))
            .attr('fill', 'steelblue')
            .on('mouseover', (event, d) => {
                tooltip
                    .style('opacity', 1)
                    .html(`Date: ${convertToDate(d.LocalTime)}<br>CO2: ${d.Co2_In}<br>Lux: ${d.front_lux_values}`)
                    .style('left', `${event.pageX + 5}px`)
                    .style('top', `${event.pageY - 28}px`);
            })
            .on('mouseout', () => {
                tooltip.style('opacity', 0);
            });
    }, [historicData]);
    */
    /*
    useEffect(() => {
        if (historicData.length === 0) return;

        const dailyData = d3.group(historicData, d => convertToDate(d.LocalTime));
        const dailyArray = Array.from(dailyData, ([date, values]) => ({ date, values }));

        const svg = d3.select(ref.current)
            .attr('width', width)
            .attr('height', height);

        const tooltip = d3.select('#tooltip');

        const dates = dailyArray.map(d => d.date);
        const maxCo2 = d3.max(historicData, d => d.Co2_In);

        const x = d3.scaleBand()
            .domain(dates)
            .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain([0, maxCo2]).nice()
            .range([height - margin.bottom, margin.top]);

        const biomass = dailyArray.map(() => Math.random() * 50 + 10);
        const biomassRadius = d3.scaleSqrt()
            .domain([0, d3.max(biomass)])
            .range([10, 50]);

        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x));

        svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y));

        const circleGroups = svg.selectAll('g.circle-group')
            .data(dailyArray)
            .enter()
            .append('g')
            .attr('class', 'circle-group')
            .attr('transform', d => `translate(${x(d.date) + x.bandwidth() / 2}, ${y(d3.mean(d.values, v => v.Co2_In))})`);

        circleGroups.append('circle')
            .attr('r', (d, i) => biomassRadius(biomass[i]))
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .on('mouseover', (event, d) => {
                tooltip
                    .style('opacity', 1)
                    .html(`Date: ${d.date}<br>Avg CO2: ${d3.mean(d.values, v => v.Co2_In).toFixed(2)}<br>Biomass: ${biomass[dailyArray.indexOf(d)].toFixed(2)}`)
                    .style('left', `${event.pageX + 5}px`)
                    .style('top', `${event.pageY - 28}px`);
            })
            .on('mouseout', () => {
                tooltip.style('opacity', 0);
            })
            .on('click', (event, d) => {
                setSelectedData(d);
            });

        circleGroups.each(function(d, i) {
            const group = d3.select(this);
            const circleRadius = biomassRadius(biomass[i]) / 2;

            if (d.values.length > 0) {
                const innerSvg = group.append('svg')
                    .attr('width', 1000)
                    .attr('height', 1000)
                    .attr('x', -circleRadius)
                    .attr('y', -circleRadius);

                const innerX = d3.scaleLinear()
                    .domain([0, d.values.length - 1])
                    .range([-circleRadius, circleRadius]);

                const innerY = d3.scaleLinear()
                    .domain([d3.min(d.values, v => v.Co2_In), d3.max(d.values, v => v.Co2_In)])
                    .range([circleRadius, -circleRadius]);

                const line = d3.line()
                    .x((_, index) => innerX(index))
                    .y(v => innerY(v.Co2_In));

                innerSvg.append('path')
                    .datum(d.values)
                    .attr('fill', 'none')
                    .attr('stroke', 'steelblue')
                    .attr('stroke-width', 2)
                    .attr('d', line);
            }
        });


        if (selectedData) {
            const circleGroup = svg.append('g')
                .attr('transform', `translate(${x(selectedData.date) + x.bandwidth() / 2}, ${y(d3.mean(selectedData.values, v => v.Co2_In))})`);

            const pie = d3.pie()
                .value(d => d.front_lux_values);

            circleGroup.selectAll('path')
                .data(pie(selectedData.values))
                .enter()
                .append('path')
                .attr('fill', (d, i) => d3.schemeCategory10[i % 10]);
        }
        downloadSVG(ref)
    }, [historicData, selectedData]);

     */
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
                })
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
                const dotCountIn = Math.round(meanCo2In / 100);
                const dotCountOut = Math.round(meanCo2Out / 100);
                const r = 5;
                //maps out dots for ever bin within the cell on the y-axis
                d3.range(dotCountIn).forEach(i => {
                    cell.append("circle")
                        .attr("cx", smallMargin.left + r + i * (r * 2 + 2))
                        .attr("cy", binY((timeBin.x0 + timeBin.x1) / 2))
                        .attr("r", r)
                        .attr("fill", "gray") //input is gray
                        .attr("opacity", 1);
                });
                d3.range(dotCountOut).forEach(i => {
                    cell.append("circle")
                        .attr("cx", smallMargin.left + r + i * (r * 2 + 2))
                        .attr("cy", binY((timeBin.x0 + timeBin.x1) / 2))
                        .attr("r", r)
                        .attr("fill", "green") //output is green indicating what was reduced
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
                .attr('d', line);

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
    }, [historicData, margin.bottom, margin.left, margin.right, margin.top, selectedData, rawCSV]);

    const closeModal = () => {
        setSelectedData(null);
    };

    return (
        <div className='border-2 border-gray-400 rounded-2xl h-full w-full flex flex-col relative'>
            <svg ref={ref}></svg>
            <div id='tooltip' className='absolute bg-white text-black p-2 border border-gray-400 rounded'></div>
            {selectedData && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center'>
                    <div className='bg-white p-4 rounded-lg'>
                        <h2 className='text-lg font-semibold mb-2'>Data Details: {selectedData.date}</h2>
                        <button onClick={closeModal} className='mt-4 bg-gray-200 px-4 py-2 rounded'>Close</button>
                    </div>
                </div>
            )}
            <HourOverTimeCo2/>
        </div>
    );
}
export default HistoricData;