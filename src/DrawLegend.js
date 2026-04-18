import * as d3 from "d3";
export const drawLegend = (legendRef, airData, lightData) => {
    const svg = d3.select(legendRef.current);
    svg.selectAll("*").remove();

    svg.attr("width", 600).attr("height", 120);

    // circle legend
    // define circle scale
    const maxDelta = d3.max(airData.deltaEncoding, d => Math.abs(d.delta));
    const r = d3.scaleSqrt()
        .domain([0, maxDelta])
        .range([0, 12])
        .clamp(true);

    // pick values to show in legend
    // const legendValues = [maxDelta, maxDelta / 2, maxDelta / 10].map(Math.round);
    const legendValues = [50, 30, 10, 1].map(Math.round).sort((a, b) => a - b);

    const sizeLegend = svg.append("g")
        .attr("transform", `translate(20, 45)`)
        .attr("font-family", "sans-serif");

    sizeLegend.append("text")
        .attr("x", 65)
        .attr("y", -30)
        .attr("font-size", "14px")
        .attr("font-weight", "500")
        .attr("fill", "#353535")
        .attr("text-anchor", "middle")
        .text("Net Carbon Removal (ppm)");

    const circleSpacing = 70;

    // draw circles in a row
    sizeLegend.selectAll("circle")
        .data(legendValues)
        .join("circle")
        .attr("cx", (d, i) => i * circleSpacing)
        .attr("cy", 0)
        .attr("r", d => r(d))
        .attr("fill", "#5bb335")
        .attr("opacity", 0.5);

    // labels
    sizeLegend.selectAll("text.label")
        .data(legendValues)
        .join("text")
        .attr("class", "label")
        .attr("x", (d, i) => i * circleSpacing)
        .attr("y", 45)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#353535")
        .text(d => d);

    // sunlight legend
    const minLight = d3.min(lightData.aggregatedData, d => d.light_in);
    const maxLight = d3.max(lightData.aggregatedData, d => d.light_in);
    const colors = ["#FFF8E1", "#FFECB3", "#FFE082", "#FFD54F", "#FFCA28"];
    const gradientWidth = 200;

    const lightLegend = svg.append("g")
        .attr("transform", `translate(350, 55)`);

    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "light-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    // color gradient
    gradient.selectAll("stop")
        .data(colors)
        .join("stop")
        .attr("offset", (d, i) => `${(i / (colors.length - 1)) * 100}%`)
        .attr("stop-color", d => d);

    // title
    lightLegend.append("text")
        .attr("x", 40)
        .attr("y", -40)
        .attr("font-size", "14px")
        .attr("fill", "#353535")
        .attr("text-anchor", "middle")
        .text("Sunlight (lux)");

    // draw strip
    lightLegend.append("rect")
        .attr("x", 0)
        .attr("y", -10)
        .attr("width", gradientWidth)
        .attr("height", 15)
        .style("fill", "url(#light-gradient)");

    // axis
    const legendScale = d3.scaleLog()
        .domain([minLight, maxLight])
        .range([0, gradientWidth]);

    lightLegend.append("g")
        .attr("transform", "translate(0, 5)")
        .call(
            d3.axisBottom(legendScale)
                .tickValues([1, 10, 100, 1000])
                .tickSize(5)
        )
        .call(g => g.select(".domain").remove())
        .attr("font-size", "12px")
        .attr("color", "#353535");
}