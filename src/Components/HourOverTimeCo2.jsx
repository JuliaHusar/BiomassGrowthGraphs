import {useEffect, useRef, useState} from "react";
import Papa from "papaparse";
import * as d3 from 'd3';
import {convertToDate, convertToHour} from "../HelperFunctions.js";

const HourOverTimeCo2 = () => {
    const ref = useRef();
    const circleLegendRef = useRef();
    const colorLegendRef = useRef();
    const progressBarRef = useRef();
    const [historicData, setHistoricData] = useState([]);
    const [selectedData, setSelectedData] = useState(null);
    const width = window.innerWidth - 100;
    const height = 800;
    const margin = {top: 20, right: 50, bottom: 70, left: 70};
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

        const colorScale1 = d3.scaleSequential()
            .domain([(d3.min(historicData, d => d.Co2_In)-300), (d3.max(historicData, d => d.Co2_In))])
            .interpolator(d3.interpolateGreens);

        const colorScale2 = d3.scaleSequential()
            .domain([(d3.min(historicData, d => d.Co2_In)-300), (d3.max(historicData, d => d.Co2_In))])
            .interpolator(d3.interpolateGreens);

        svg.selectAll('g.point')
            .data(historicData)
            .enter()
            .append('g')
            .attr('class', 'point')
            .attr('transform', d => `translate(${x(convertToDate(d.LocalTime)) + x.bandwidth() / 2}, ${(() => {
                const date = new Date(d.LocalTime);
                return y(date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds());
            })()})`)
            .on('mouseover', (event, d) => {
                tooltip
                    .style('opacity', 1)
                    .html(`Date: ${convertToDate(d.LocalTime)}<br>Time: ${new Date(d.LocalTime).toLocaleTimeString()}<br>Lux: ${d.front_lux_values}<br>Co2 (Input): ${d.Co2_In}<br>Co2 (Output): ${d.Co2_Out}`) // Updated tooltip
                    .style('left', `${event.pageX + 5}px`)
                    .style('top', `${event.pageY - 28}px`);
            })
            .on('mouseout', () => {
                tooltip.style('opacity', 0);
            })
            .each(function(d) {
                const currentRadius = radius(d.front_lux_values);
                const co2Difference = d.Co2_In - d.Co2_Out;
                console.log(co2Difference)
                const gap = (co2Difference / 300) * 2;
                const arc = d3.arc()
                    .outerRadius(currentRadius)
                    .innerRadius(0);

                d3.select(this)
                    .append('path')
                    .attr('d', arc({ startAngle: Math.PI, endAngle: 2 * Math.PI }))
                    .attr('fill', colorScale1(d.Co2_In))
                    .attr('transform', `translate(${-gap * currentRadius}, 0)`); // Shift left

                d3.select(this)
                    .append('path')
                    .attr('d', arc({ startAngle:0 , endAngle: Math.PI }))
                    .attr('fill', colorScale2(d.Co2_Out))
                    .attr('transform', `translate(${gap * currentRadius}, 0)`); // Shift right
            });

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

        const color1LegendData = [
            { label: 'Low CO2', color: colorScale1(d3.min(historicData, d => d.Co2_In)) },
            { label: 'Medium CO2', color: colorScale1((d3.min(historicData, d => d.Co2_In) + d3.max(historicData, d => d.Co2_In)) / 2) },
            { label: 'High CO2', color: colorScale1(d3.max(historicData, d => d.Co2_In)) }
        ];

        const circleLegendData = [
            {label: "Low Lux", radius: radius(d3.min(luxIn) + d3.max(luxIn) / 4)},
            {label: "Medium Lux", radius: radius((d3.min(luxIn) + d3.max(luxIn)) / 2)},
            {label: "High Lux", radius: radius(d3.max(luxIn))}
        ]


        const colorLegendSvg = d3.select(colorLegendRef.current)
            .attr('width', width/12)
            .attr('height', 60)
        colorLegendSvg.selectAll('*').remove();

        const circleLegendSvg = d3.select(circleLegendRef.current)
            .attr('width', width/5)
            .attr('height', 80);
        circleLegendSvg.selectAll('*').remove();

        const colorLegend = colorLegendSvg.append('g')
            .attr('class', 'legend')

        const circleLegend = circleLegendSvg.append('g')
            .attr('class', 'circle-legend')

        color1LegendData.forEach((item, index) => {
            colorLegend.append('rect')
                .attr('x', 0)
                .attr('y',  index * 20)
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', item.color);

            colorLegend.append('text')
                .attr('x', 20)
                .attr('y', index * 20 + 15)
                .style('font-size', '12px')
                .text(item.label);
        });

        circleLegendData.forEach((item, index) => {
            circleLegend.append('circle')
                .attr('cx', index * 80 +20)
                .attr('cy', 40)
                .attr('r', item.radius)
                .attr('fill', 'none')
                .attr('stroke', 'black');

            circleLegend.append('text')
                .attr('x', index * 80)
                .attr('y', 76)
                .style('font-size', '12px')
                .text(item.label);
        });

        const progressBar = d3.select(progressBarRef.current)
            .attr('width', 200)
            .attr('height', 20)
            .style('background-color', 'gray');
        progressBar.selectAll('*').remove();

        progressBar.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 200)
            .attr('height', 30)
            .attr('fill', 'steelblue');
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
        <div className='border-2 w-full'>
            <div className='border-gray-400 rounded-2xl h-full w-2/3 flex flex-col'>
                <div className='flex flex-row items-end justify-end w-full mt-10'>
                    <svg ref={circleLegendRef}></svg>
                    <svg ref={colorLegendRef}></svg>
                    <div id='granularity-slider' className='flex flex-col justify-start items-start p-5 pb-0'>
                        <input type="range" min='0' max='10' value={granularity} onChange={handleDrag}
                               className='w-full'/>
                        <p className='mt-5'>Adjust Data granularity</p>
                    </div>
                </div>
                <div className='flex items-center justify-center mt-10'>
                    <svg ref={progressBarRef}></svg>
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
        </div>
    );

}
export default HourOverTimeCo2;