import * as d3 from 'd3';
import {useEffect, useRef, useState} from "react";
import Papa from "papaparse";
import '../App.css';
import {convertToDate} from "../HelperFunctions.js";
import HourOverTime from "../Components/HourOverTime.jsx";
import axios from "axios";
import HourOverTimeCo2 from "../Components/HourOverTimeCo2.jsx";

const HistoricData = () => {
    const ref = useRef();
    const [historicData, setHistoricData] = useState([]);
    const [selectedData, setSelectedData] = useState(null);
    const width = 1400;
    const height = 900;
    const margin = {top: 20, right: 20, bottom: 20, left: 40};
    useEffect(() => {
        const getCSV = async () => {
            try{
                const response = await fetch ('/April17Cleaned.csv')
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
    }, [historicData, selectedData]);

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