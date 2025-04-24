import {useEffect, useRef, useState} from "react";
import Papa from "papaparse";
import * as d3 from 'd3';
import {convertToDate, convertToHour} from "../HelperFunctions.js";

const HourOverTime = () => {
    const ref = useRef();
    const legendRef = useRef();
    const [historicData, setHistoricData] = useState([]);
    const [selectedData, setSelectedData] = useState(null);
    const width = 2000
    const height = 800;
    const margin = {top: 80, right: 50, bottom: 70, left: 70};
    const [granularity, setGranularity] = useState(10);
    const [originalData, setOriginalData] = useState([]);

    useEffect(() => {
        const getCSV = async () => {
            try{
                const response = await fetch ('/April17Cleaned.csv')
                const text = await response.text();

                Papa.parse(text, {
                    complete: (results) => {
                        results.data.pop();
                        const filtered = results.data.filter((_, index) => index % 10 === 0);
                        setOriginalData(filtered);
                        setHistoricData(filtered);
                        console.log(filtered)
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

        svg.selectAll('*').remove();

        const tooltip = d3.select('#tooltip');
        const luxIn = historicData.map(d => d.front_lux_values);
        const co2In = historicData.map(d => d.Co2_In);
        const allDates = Array.from(d3.group(historicData, d => convertToDate(d.LocalTime)).keys()).sort((a, b) => new Date(a) - new Date(b));

        const x = d3.scaleBand()
            .domain(allDates)
            .range([margin.left, width - margin.right])
            .padding(0.1);

        const y = d3.scaleLinear()
            .domain([5 * 60 * 60, 24 * 60 * 60])
            .range([margin.top, height - margin.bottom]);

        const radius = d3.scaleSqrt()
            .domain([0, d3.max(luxIn)])
            .range([0, 20]);

        const colorScale = d3.scaleSequential()
            .domain([(d3.min(historicData, d => d.Co2_In)-100), (d3.max(historicData, d => d.Co2_In)-100)])
            .interpolator(d3.interpolateGreens);

        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).tickFormat(d => d));

        svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y)
                .ticks(19)
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
            .attr('fill', d => colorScale(d.Co2_In))
            .on('mouseover', (event, d) => {
                tooltip
                    .style('opacity', 1)
                    .html(`Date: ${convertToDate(d.LocalTime)}<br>Time: ${new Date(d.LocalTime).toLocaleTimeString()}<br>Lux: ${d.front_lux_values}<br>Co2: ${d.Co2_In}`)
                    .style('left', `${event.pageX + 5}px`)
                    .style('top', `${event.pageY - 28}px`);
            })
            .on('mouseout', () => {
                tooltip.style('opacity', 0);
            });

        const legendSvg = d3.select(legendRef.current)
            .attr('width', width)
            .attr('height', 200);
        legendSvg.selectAll('*').remove();

        const legend = legendSvg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width - margin.right + 20}, ${margin.top})`);

        const circleLegend = legendSvg.append('g')
            .attr('class', 'circle-legend')
            .attr('transform', `translate(${width - margin.right - 200}, ${margin.top})`);

        const legendData = [
            { label: 'Low CO2 Input', color: colorScale(d3.min(historicData, d => d.Co2_In)) },
            { label: 'Medium CO2 Input', color: colorScale((d3.min(historicData, d => d.Co2_In) + d3.max(historicData, d => d.Co2_In)) / 2) },
            { label: 'High CO2 Input', color: colorScale(d3.max(historicData, d => d.Co2_In)) }
        ];

        const circleLegendData = [
            {label: "Low Lux", radius: radius(d3.min(luxIn) + d3.max(luxIn) / 4)},
            {label: "Medium Lux", radius: radius((d3.min(luxIn) + d3.max(luxIn)) / 2)},
            {label: "High Lux", radius: radius(d3.max(luxIn))}
        ]

        legendData.forEach((item, index) => {
            legend.append('rect')
                .attr('x', -300)
                .attr('y', index * 20 -20)
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', item.color);

            legend.append('text')
                .attr('x', -280)
                .attr('y', index * 20 - 10)
                .style('font-size', '12px')
                .text(item.label);
        });

        circleLegendData.forEach((item, index) => {
            circleLegend.append('circle')
                .attr('cx', -200)
                .attr('cy', index * 45 -20)
                .attr('r', item.radius)
                .attr('fill', 'none')
                .attr('stroke', 'black');

            circleLegend.append('text')
                .attr('x', -170)
                .attr('y', index * 45 - 20)
                .style('font-size', '12px')
                .text(item.label);
        });

    }, [historicData]);

    const closeModal = () => {
        setSelectedData(null);
    };

    const handleDrag = (event) => {
        const sliderValue = event.target.value;
        const maxSliderValue = 10;
        const granularity = maxSliderValue - sliderValue + 1;
        setGranularity(sliderValue);
        const filteredData = originalData.filter((_, index) => index % granularity === 0);
        setHistoricData(filteredData);
    };

    return (
        <div className='border-2 border-gray-400 rounded-2xl h-full w-full flex flex-col'>
            <div className='absolute'>
                <div id='granularity-slider' className=' top-0 right-0'>
                    <input type="range" min='0' max='10' value={granularity} onChange={handleDrag} className='w-1/12'/>
                </div>
                <svg ref={legendRef}></svg>
            </div>
            <div className='svg-container'
                 style={{width: '100%', height: '100%', overflow: 'scroll'}}>

                <svg ref={ref}></svg>
            </div>
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