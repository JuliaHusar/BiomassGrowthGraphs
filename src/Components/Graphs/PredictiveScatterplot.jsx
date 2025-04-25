import {useEffect, useRef, useState} from "react";
import Papa from "papaparse";
import * as d3 from "d3";
import ProgressGauge from "../ProgressGauge.jsx";
import {
    getAccurateXValues,
    calculateLinearRegression,
    returnMultivariateRegression,
    getSlopeThreshold, calculateLogisticRegression, calculateLogarithmicRegression
} from "../Math/MathFunctions.js";
import predictedValues from "../../../public/PredictedValues.json"

const PredictiveScatterplot = ({selectedMonth, setSelectedMonth}) => {
    const ref = useRef();
    const [biomassData, setBiomassData] = useState([]);
    const width = 2000;
    const height = 800;
    const margin = {top: 50, right: 50, bottom: 70, left: 70};
    const months2025 = {"April": [], "March": []};
    const years = {"2025": months2025};
    const barHeight = 20;
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    useEffect(() => {
        const getCSV = async () => {
            try{
                const response = await fetch ('/BiomassApr17.csv')
                const text = await response.text();
                Papa.parse(text, {
                    complete: (results) => {
                        results.data
                        setBiomassData(results.data)
                    },
                    header:true,
                    dynamicTyping: true,
                });
            } catch (error){
                console.log(error)
            }
        }
        getCSV().then(console.log(biomassData));
    }, []);


    const transformPredictedValuesForCombination = predictedValues
        .filter(item => new Date(item.date) >= new Date('4/17/25'))
        .map(item => {
            const date = new Date(item.date);
            return {
                collection_date: date,
                Biomass_g_L: item.yValue,
                xValue: item.xValue,
                source: 'predicted'
            };
        });

    const transformPredictedValuesForLinearRegression = predictedValues.map(item => {
        const date = new Date(item.date);
        return {
            collection_date: date,
            Biomass_g_L: item.yValue,
            xValue: item.xValue,
            source: 'predicted'
        };
    })


    useEffect(() => {
        if (biomassData.length === 0) return;
        const standardLinearRegression = calculateLinearRegression(biomassData);
        const xValues = getAccurateXValues(biomassData);
        const svg = d3.select(ref.current)
            .attr("width", width)
            .attr("height", height);

        const tooltip = d3.select("#tooltip");

        const biomassDates = biomassData.map((d) => new Date(d.collection_date));
        const biomassGPerL = biomassData.map((d) => d.Biomass_g_L);
        const combinedData = [...biomassData, ...transformPredictedValuesForCombination];
        const combinedDates = combinedData.map((d) => new Date(d.collection_date));
        const combinedGPerL = combinedData.map((d) => d.Biomass_g_L);
        const combinedLogData = [{"collection_date": '3/19/25', 'Biomass_g_L': 3.038746667}, ...combinedData];
        const combinedLogDates = combinedLogData.map((d) => new Date(d.collection_date));
        const allXValues = getAccurateXValues(combinedData);
        console.log(getSlopeThreshold(biomassData));

        svg.selectAll("*").remove();

        const x = d3
            .scaleTime()
            .domain(d3.extent(combinedLogDates))
            .range([margin.left, width - margin.right]);

        const y = d3
            .scaleLinear()
            .domain([0, d3.max(combinedGPerL)])
            .range([height - margin.bottom, margin.top]);

        const radius = d3
            .scalePow()
            .exponent(4)
            .domain([0, d3.max(biomassGPerL)])
            .range([1, 20]);

        //Initial Graph/Axis
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x));

        svg.append("g")
            .attr("transform", `translate(${margin.left}, 0)`)
            .call(d3.axisLeft(y));

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height - margin.bottom + 45)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "black")
            .text("Date");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", 0 - height / 2)
            .attr("y", margin.left - 45)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "black")
            .text("Biomass g/L");

        //Initial Datapoints, size, and color

        const circlesGroup = svg.selectAll(".data-point")
            .data(combinedLogData)
            .enter()
            .append("g")
            .attr("class", "data-point")
            .attr("transform", d => `translate(${x(new Date(d.collection_date))},${y(d.Biomass_g_L)})`);


        circlesGroup.append("circle")
            .attr("r", d => radius(d.Biomass_g_L))
            .attr("fill", d => d.source === 'predicted' ? "orange" : (d.Biomass_g_L < 0 ? "green" : "steelblue"))
            .on("mouseover", function (event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                tooltip.html(`Date: ${d.collection_date}<br/>Biomass: ${d.Biomass_g_L.toFixed(2)} g/L`)
            })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX - width/4) + "px")
                    .style("top", (event.pageY - 80) + "px");
            })
            .on("mouseout", function (event) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        //Line Generator
        const lineGenerator = d3.line()
            .x((d) => x(d.x))
            .y((d) => y(d.y));

        //Standard Linear Regression
        //This linear regression uses existing historical data maps into the territory of the predicted data
        const standardLinearRegressionLineData = allXValues.map((x) => ({
            x: new Date(biomassDates[0].getTime() + (x - 1) * 24 * 60 * 60 * 1000),
            y: standardLinearRegression.slope * x + standardLinearRegression.intercept,
        }))
        const standardLine = d3
            .line()
            .x((d) => x(d.x))
            .y((d) => y(d.y));
        //Standard Linear Regression Line
        svg.append("path")
            .datum(standardLinearRegressionLineData)
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .attr("d", standardLine);

        //Multivariable Linear Regression
        //This linear regression uses the multivariate model that Nishka created using ML techniques
        //  (g/L) = 0.037711 * t + 3.806281
        const regression = returnMultivariateRegression();

        const startDate = d3.min(combinedData, d => new Date(d.collection_date));
        //Multivariate Regression Line

        svg.append("path")
            .datum(transformPredictedValuesForLinearRegression.map(d => ({
                x: d.collection_date,
                y: regression.slope * d.xValue + regression.intercept
            })))
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("d", lineGenerator);

        //Log Regression
        const logRegression = calculateLogarithmicRegression(biomassData);
        console.log(logRegression);
        // Generate dense x values from 0.0001 to the first x value
        const minX = 0.0001;
        const firstX = allXValues[0];
        const denseX = d3.range(minX, firstX, 0.01);
        const extendedXValues = [...denseX, ...allXValues];

        const logRegressionLineData = extendedXValues.map((x) => ({
            x: new Date(startDate.getTime() + (x - 1) * 24 * 60 * 60 * 1000),
            y: logRegression.a + logRegression.b * Math.log(x)
        }));
        const logLine = d3
            .line()
            .x((d) => x(d.x))
            .y((d) => y(d.y));

        //Log Distance Lines
        svg
            .append("path")
            .datum(logRegressionLineData)
            .attr("fill", "none")
            .attr("stroke", "green")
            .attr("stroke-width", 2)
            .attr("d", logLine);

        svg.selectAll(".data-point")
            .append("line")
            .attr("class", "distance-line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", d => {
                const startDate = d3.min(combinedLogData, d => new Date(d.collection_date));
                const currentDate = new Date(d.collection_date);
                const xVal = ((currentDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                const logY = logRegression.a + logRegression.b * Math.log(xVal);
                return y(logY) - y(d.Biomass_g_L);
            })
            .attr("stroke", "black")
            .attr("stroke-width", 0.5)
            .attr("stroke-dasharray", "2,2");

        const legendSVG = svg.append("g")

        legendSVG
            .attr("transform", `translate(${width - margin.right - 100}, ${margin.top})`);



    }, [biomassData]);

    return(
        <div className='w-3/4 ml-5' style={{ position: 'relative' }}>
            <div className='w-full'>
                {months.map((month, index) => (
                    <button
                        key={index}
                        className={` text-black font-bold py-2 px-4 rounded ${selectedMonth === month ? 'cursor-pointer underline underline-offset-8' : ''}`}
                        onClick={() => setSelectedMonth(month)}
                    >
                        {month}
                    </button>
                ))}
            </div>
            <ProgressGauge/>
            <div className='w-full overflow-scroll'>
                <svg ref={ref} style={{transform: 'scale(0.9)', transformOrigin: 'top left'}}></svg>
            </div>
            <div
                id="tooltip"
                style={{
                    position: 'absolute',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    borderRadius: '5px',
                    opacity: 0,
                    pointerEvents: 'none',
                }}
            ></div>
        </div>
    );
}
export default PredictiveScatterplot;