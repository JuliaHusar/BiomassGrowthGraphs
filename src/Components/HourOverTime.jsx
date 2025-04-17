import {useEffect, useRef, useState} from "react";
import Papa from "papaparse";
import * as d3 from 'd3';
import {convertToDate, convertToHour} from "../HelperFunctions.js";

const HourOverTime = () => {
    const ref = useRef();
    const [historicData, setHistoricData] = useState([]);
    const [selectedData, setSelectedData] = useState(null);
    const width = 1400;
    const height = 900;
    const margin = {top: 50, right: 50, bottom: 70, left: 70};
    useEffect(() => {
        const getCSV = async () => {
            try{
                const response = await fetch ('/April4Co2Cleaned.csv')
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

    useEffect(() => {
        if (historicData.length === 0) return;

        const svg = d3.select(ref.current)
            .attr('width', width)
            .attr('height', height);

        const tooltip = d3.select('#tooltip');
        const luxIn = historicData.map(d => d.front_lux_values);
        const allDates = Array.from(d3.group(historicData, d => convertToDate(d.LocalTime)).keys()).sort();

        const x = d3.scaleBand()
            .domain(allDates)
            .range([margin.left, width - margin.right])
            .padding(0.1);

        const y = d3.scaleLinear()
            .domain([0, 24 * 60 * 60])
            .range([margin.top, height - margin.bottom]);

        const radius = d3.scaleSqrt()
            .domain([0, d3.max(luxIn)])
            .range([0, 20]);

        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).tickFormat(d => d));

        svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y)
                .ticks(24)
                .tickFormat(d => {
                    const hour = Math.floor(d / 3600);
                    return `${String(hour).padStart(2, '0')}:00`;
                })
            );

        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height - margin.bottom + 45)
            .style('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('fill', 'black')
            .text('Date');

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', 0 - (height / 2))
            .attr('y', margin.left - 45)
            .style('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('fill', 'black')
            .text('Hour of Day');

        svg.selectAll('circle')
            .data(historicData)
            .enter()
            .append('circle')
            .attr('cx', d => x(convertToDate(d.LocalTime)) + x.bandwidth() / 2)
            .attr('cy', d => {
                const date = new Date(d.LocalTime);
                const secondsInDay = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
                return y(secondsInDay);
            })
            .attr('r', d => radius(d.front_lux_values))
            .attr('fill', 'steelblue')
            .on('mouseover', (event, d) => {
                tooltip
                    .style('opacity', 1)
                    .html(`Date: ${convertToDate(d.LocalTime)}<br>Time: ${new Date(d.LocalTime).toLocaleTimeString()}<br>Lux: ${d.front_lux_values}`)
                    .style('left', `${event.pageX + 5}px`)
                    .style('top', `${event.pageY - 28}px`);
            })
            .on('mouseout', () => {
                tooltip.style('opacity', 0);
            });
    }, [historicData]);

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
        </div>
    );

}
export default HourOverTime;