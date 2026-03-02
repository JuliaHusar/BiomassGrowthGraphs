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

        const dailyData = d3.group(historicData, d => {
            const date = new Date(d.LocalTime);
            return d3.timeDay(date).toISOString().split('T')[0];
        });
        const dailyArray = Array.from(dailyData, ([date, values]) => ({ date, values }));

        let data = Object.assign(d3.csvParse(rawCSV), {y1: "Time", y2: "Date"})
        const svg = d3.select(ref.current)
            .attr('width', width)
            .attr('height', height);

        //const tooltip = d3.select('#tooltip');
        const timeArray = (dailyArray.map(d => d.values.map(v => (v.LocalTime))))
        const groupedDays = d3.groups(timeArray, (d) => (d.values))
        const lightArray = dailyArray.map(d =>
            d.values.map(v => ({
                time: v.LocalTime,
                light: v.front_lux_values
            }))
        );
        const dates = dailyArray.map(d => (d.date));

        const x = d3.scaleBand()
            .domain(dates.map(d => (d)))
            .range([margin.left, width - margin.right]);
        const y = d3.scaleLinear()
            .domain([0, 24])
            .range([margin.top, height - margin.bottom]);

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

            const luxAxis = d3.scaleLinear()
                .domain([0, d3.max(historicData, d => d.front_lux_values)])
                .range([smallMargin.left, cellWidth - smallMargin.right]);

            const innerY = d3.scaleLinear()
                .domain([0, 24])
                .range([0, height - margin.bottom - margin.top]); //

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
            cell.append('g')
                .attr('transform', `translate(${smallMargin.left}, 0)`)
                .call(d3.axisLeft(innerY)
                    .ticks(24)
                    .tickFormat(d => `${String(Math.floor(d)).padStart(2, '0')}:00`)
                )

            cell.append('g')
                .attr('transform', `translate(0, ${height - margin.top - margin.bottom})`)
                .call(d3.axisBottom(luxAxis).ticks(5))


            const n = 15;
            const sampledData = historicData.filter((_, i) => i % n === 0);

            cell.append('path')
                .datum(d.values)
                .attr('fill', 'none')
                .attr('stroke', '#69b3a2')
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

        /*
        const x = d3.scaleBand()
            .domain(dates)
            .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain([24, 0])
            .range([height - margin.bottom, margin.top]);

        svg.append('g')
            .attr('transform', `translate(${margin.left})`)
            .call(d3.axisLeft(y)
                .ticks(19)
                .tickFormat(d => {
                    return `${String(d).padStart(2, '0')}:00`;
                })
            );

        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x))

         */

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