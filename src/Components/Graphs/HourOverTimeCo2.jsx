import {useEffect, useRef, useState} from "react";
import Papa from "papaparse";
import * as d3 from 'd3';
import {convertToDate, convertToHour} from "../Math/HelperFunctions.js";

const HourOverTimeCo2 = () => {
    const ref = useRef();
    const circleLegendRef = useRef();
    const colorLegendRef = useRef();
    const progressBarRef = useRef();
    const barRef = useRef();
    const yAxisRef = useRef();
    const [historicData, setHistoricData] = useState([]);
    const [selectedData, setSelectedData] = useState(null);
    const width = window.innerWidth * 2;
    const height = 800;
    const margin = {top: 20, right: 50, bottom: 70, left: 70};
    const [granularity, setGranularity] = useState(10);
    const [originalData, setOriginalData] = useState([]);
    const [selectedValues, setSelectedValues] = useState("Positive Differences");


    const [detailDate, setDetailDate] = useState('');

    useEffect(() => {
        const getCSV = async () => {
            try{
                const response = await fetch ('/filteredData.csv')
                const text = await response.text();

                Papa.parse(text, {
                    complete: (results) => {
                        results.data.pop();
                        const filtered = results.data.filter((_, index) => index % 10 === 0);
                        setOriginalData(filtered);
                        setHistoricData(filtered);
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

        const barHeight = 150;
        const gap = 10;

        const svg = d3.select(ref.current)
            .attr('width', width)
            .attr('height', height + gap + barHeight);

        svg.selectAll('*').remove();

        const tooltip = d3.select('#tooltip');
        const luxIn = historicData.map(d => d.front_lux_values);
        const co2In = historicData.map(d => d.Co2_In);
        const allDates = Array.from(d3.group(historicData, d => convertToDate(d.LocalTime)).keys())
            .sort((a, b) => new Date(a) - new Date(b));
        const x = d3.scaleBand()
            .domain(allDates)
            .range([0, (width - margin.right) * 0.5])
            .padding(0.1);

        const xAxisG = svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).tickFormat(d => d));

        const y = d3.scaleLinear()
            .domain([5 * 60 * 60, 24 * 60 * 60])
            .range([margin.top, height - margin.bottom]);

        const radius = d3.scaleSqrt()
            .domain([0, d3.max(luxIn)])
            .range([0, 20]);
        const colorScale1 = d3.scaleSequential()
            .domain([(d3.min(historicData, d => d.Co2_In)), (d3.max(historicData, d => d.Co2_In))])
            .interpolator(d3.interpolateGreens);

        const colorScale2 = d3.scaleSequential()
            .domain([(d3.min(historicData, d => d.Co2_In)), (d3.max(historicData, d => d.Co2_In))])
            .interpolator(d3.interpolateGreens);
        console.log(d3.min(historicData, d=> d.Co2_In) - 300)
        console.log(colorScale2)
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
                console.log()
            })
            .on('mouseout', () => {
                tooltip.style('opacity', 0);
            })
            .each(function(d) {
                const currentRadius = radius(d.front_lux_values);
                  const co2Difference = (d.Co2_In - d.Co2_Out); //Absolute value of difference
                const gap = (Math.asinh(co2Difference) /10)
                const arc = d3.arc()
                    .outerRadius(currentRadius)
                    .innerRadius(0);
                let strokeWidth;
                currentRadius > 3 ? strokeWidth = 0.5 :  strokeWidth = 0.1

                if (co2Difference >= 0) {
                    d3.select(this)
                        .append('path')
                        .attr('d', arc({startAngle: Math.PI, endAngle: 2 * Math.PI}))
                        .attr('stroke-width', strokeWidth)
                        .attr('fill', colorScale1(d.Co2_In))
                        .attr('stroke', 'black')
                        .attr('transform', `translate(${-gap * currentRadius}, 0)`); // Shift left

                    d3.select(this)
                        .append('path')
                        .attr('d', arc({startAngle: 0, endAngle: Math.PI}))
                        .attr('fill', colorScale2(d.Co2_Out))
                        .attr('stroke', 'black')
                        .attr('stroke-width', strokeWidth)
                        .attr('transform', `translate(${gap * currentRadius}, 0)`); // Shift left

                } else {
                    d3.select(this)
                        .append('path')
                        .attr('d', arc({startAngle: Math.PI, endAngle: 2 * Math.PI}))
                        .attr('fill', colorScale1(d.Co2_Out))
                        .attr('stroke', '#D35FB7')
                        .attr('stroke-width', strokeWidth * 1.5)
                        .attr('transform', `translate(${(currentRadius - (gap*currentRadius))}, 0)`)
                      //  .attr('transform', `translate(${gap}, 0)`);
                    d3.select(this)
                        .append('path')
                        .attr('d', arc({startAngle: 0, endAngle: Math.PI}))
                        .attr('fill', colorScale2(d.Co2_In))
                        .attr('stroke', '#D35FB7')
                        .attr('stroke-width', strokeWidth * 1.5)
                        .attr('transform', `translate(${(-currentRadius + (gap*currentRadius))}, 0)`)
                        //.attr('transform', `translate(${-gap}, 0)`); // Shift right
                    //Switch the starting position of these circles to be with their backs in the center. Any deviation will then reflect on this
                }
            });

        const barSvg = d3.select(barRef.current)
            .attr('width', width)
            .attr('height', 220);
        barSvg.selectAll('*').remove();

        const byDate = d3.rollups(
            historicData,
            v => d3.mean(v, d => d.Co2_In - d.Co2_Out),
            d => convertToDate(d.LocalTime)
        );
        const barData = byDate
            .sort((a, b) => new Date(a[0]) - new Date(b[0]))
            .map(([date, value]) => ({ date, value }));

        const barScale = 0.5;
        const hideNegatives = true;

// Scale values
        const scaled = barData.map(d => ({ ...d, v: d.value * barScale }));
        const dataForBars = hideNegatives ? scaled.filter(d => d.v > 0) : scaled;

// Bar Y scale
        const barMargin = { top: 30, right: 20, bottom: 30, left: 0 };
        let barY, y0;

        if (hideNegatives) {
            const maxPos = d3.max(dataForBars, d => d.v) ?? 1;
            barY = d3.scaleLinear()
                .domain([0, maxPos]).nice()
                .range([barHeight - barMargin.bottom, barMargin.top]);
            y0 = barY(0);
        } else {
            const maxAbs = d3.max(scaled, d => Math.abs(d.v)) ?? 1;
            barY = d3.scaleLinear()
                .domain([-maxAbs, maxAbs]).nice()
                .range([barHeight - barMargin.bottom, barMargin.top]);
            y0 = barY(0);
        }

        const xMax = x.range()[1];
        const barG = xAxisG.append('g')
            .attr('class', 'bar-layer')
            .attr('transform', `translate(0,${gap-130})`);

// Optional baseline
        barG.append('line')
            .attr('x1', 0)
            .attr('x2', xMax)
            .attr('y1', y0)
            .attr('y2', y0)
            .attr('stroke', '#999');

// Draw bars
        const bars = barG.selectAll('rect.bar')
            .data(dataForBars, d => d.date);

        bars.enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.date) ?? 0)
            .attr('width', x.bandwidth())
            .attr('y', d => hideNegatives ? barY(d.v) : (d.v >= 0 ? barY(d.v) : y0))
            .attr('height', d => hideNegatives
                ? (y0 - barY(d.v))
                : Math.abs(barY(d.v) - y0))
            .attr('fill', d => d.v >= 0 ? '#2e7d32' : '#c62828');

        bars.exit().remove();

        const fmt = d3.format('.0f'); // format the value you want to show

        barG.selectAll('text.bar-label')
            .data(dataForBars, d => d.date)
            .join('text')
            .attr('class', 'bar-label')
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', '#111')
            .style('pointer-events', 'none')
            .attr('x', d => (x(d.date) ?? 0) + x.bandwidth() / 2)
            .attr('y', d => (
                (hideNegatives || d.v >= 0) ? barY(d.v) : y0  // top of the bar
            ) - 4)                                           // a few px above
            .text(d => fmt(d.value) + " ppm total")


        const yAxis = d3.select(yAxisRef.current)

        yAxis.selectAll('*').remove();
        yAxis.append('g')
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

        yAxis.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', 0 - (height / 2))
            .attr('y', margin.left - 45)
            .style('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('fill', 'black')
            .text('Hour of Day');
        yAxis.append('line')
            .attr('x1', margin.left)
            .attr('x2', margin.left)
            .attr('y1', 0)
            .attr('y2', height - margin.bottom)
            .attr('stroke', 'black')
            .attr('stroke-width', 2);

        const color1LegendData = [
            { label: 'PPM < 278', color: colorScale1(d3.min(historicData, d => d.Co2_In)) },
            { label: 'PPM > 278 and PPM < 556', color: colorScale1((d3.min(historicData, d => d.Co2_In) + d3.max(historicData, d => d.Co2_In)) / 2) },
            { label: 'PPM > 556', color: colorScale1(d3.max(historicData, d => d.Co2_In)) }
        ];

        const circleLegendData = [
            {label: "Low Lux", radius: radius(d3.min(luxIn) + d3.max(luxIn) / 4)},
            {label: "Medium Lux", radius: radius((d3.min(luxIn) + d3.max(luxIn)) / 2)},
            {label: "High Lux", radius: radius(d3.max(luxIn))}
        ]


        const colorLegendSvg = d3.select(colorLegendRef.current)
            .attr('width', width/15)
            .attr('height', 60)
        colorLegendSvg.selectAll('*').remove();

        const circleLegendSvg = d3.select(circleLegendRef.current)
            .attr('width', width/12)
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


        // Build a combined SVG (Y axis + main) for download
        const mainSvgEl = ref.current;
        const yAxisSvgEl = yAxisRef.current;

        const mainW = Number(mainSvgEl.getAttribute('width')) || mainSvgEl.clientWidth;
        const mainH = Number(mainSvgEl.getAttribute('height')) || mainSvgEl.clientHeight;

        const combined = d3.create('svg')
            .attr('xmlns', 'http://www.w3.org/2000/svg')
            .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
            .attr('width', margin.left + mainW)
            .attr('height', mainH);

        const yAxisGNode = yAxisSvgEl.querySelector('g');
        if (yAxisGNode) {
            combined.append(() => yAxisGNode.cloneNode(true));
        }

        const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        wrap.setAttribute('transform', `translate(${margin.left},0)`);
        Array.from(mainSvgEl.childNodes).forEach(n => wrap.appendChild(n.cloneNode(true)));
        combined.node().appendChild(wrap);

        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(combined.node());
        source = '<?xml version="1.0" standalone="no"?>\n' + source;
        const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
        document.getElementById('svg-download').setAttribute('href', url);
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

    const handleOptionChange = (e) => {
        setSelectedValues(e.target.value)
        console.log(e.target.value)
        filterNegativePositive(e.target.value)
        //setHistoricData()
    }

    useEffect(() => {
        if (!ref.current) return;

        const svg = d3.select(ref.current);

        const strokeFor = d => {
            const diff = d.Co2_In - d.Co2_Out;
            switch (selectedValues) {
                case 'Positive Differences':
                    return diff > 0 ? '#D35FB7' : '#000000'; // highlight positives
                case 'Negative Differences':
                    return diff < 0 ? '#D35FB7' : '#000000'; // highlight negatives
                default:
                    return '#222'; // All
            }
        };

        // Update existing paths (two semicircles per point)
        svg.selectAll('g.point path')
            .attr('stroke', d => strokeFor(d))
            .attr('stroke-width', d => (selectedValues === 'All' ? 0.5 : 1));
    }, [selectedValues, historicData]);


    function filterNegativePositive(value){
        var selectedVal = value;
        switch (value) {
            case "All":
                setHistoricData(originalData);
                return;
            case "Positive Differences":
              //  const positiveFilter = originalData.filter(d => (d.Co2_In - d.Co2_Out) > 0);
            //    setHistoricData(positiveFilter)
                return;
            case "Negative Differences":
             //   const negativeFilter = originalData.filter(d => (d.Co2_In - d.Co2_Out) < 0);
              //  setHistoricData(negativeFilter)
                return;
            default:
            break;
        }
        return selectedVal;
    }

    return (
        <div className='border-2 w-full'>
            <a id='svg-download' href='#' download='hour_over_time_co2.svg' className='absolute top-5 right-5 bg-gray-200 p-2 rounded'>Download SVG</a>
            <div className='border-gray-400 rounded-2xl h-full w-full flex flex-col'>
                <div className='flex flex-row items-center align-middle justify-center w-full mt-10 gap-5'>
                    <div className='flex flex-col items-start align-middle justify-start gap-2'>
                        <label>
                            <input type="radio" name="Positive Differences" value="Positive Differences"
                                   checked={selectedValues === "Positive Differences"} onChange={handleOptionChange}/>
                            <span className='pl-2'>Select Positive Differences</span>
                        </label>
                        <label>
                            <input type="radio" name="Negative Differences" value="Negative Differences"
                                   checked={selectedValues === "Negative Differences"} onChange={handleOptionChange}/>
                            <span className='pl-2'>Select Negative Differences</span>
                        </label>
                    </div>
                    <svg className='align-middle justify-center items-center' ref={circleLegendRef}></svg>
                    <svg ref={colorLegendRef}></svg>
                    <div id='granularity-slider' className='flex flex-col justify-start items-start pb-0'>
                        <input type="range" min='0' max='10' value={granularity} onChange={handleDrag}
                               className='w-full'/>
                        <p className='mt-5'>Adjust Data granularity</p>
                    </div>
                </div>
                <div className='flex items-center justify-center mt-10'>
                    {/*  <svg ref={progressBarRef}></svg> */}
                </div>
                <div style={{display: 'flex', position: 'relative', height: '800px'}}>
                    <div style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        background: 'white'
                    }}>
                        <svg ref={yAxisRef} width={margin.left} height={height}></svg>
                    </div>
                    <div className='svg-container' style={{
                        width: '100%'
                    }}>
                        <svg ref={ref}></svg>
                        <svg ref={barRef} style={{marginTop: 10}}></svg>

                    </div>
                    <div className='flex flex-col'>
                    </div>
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