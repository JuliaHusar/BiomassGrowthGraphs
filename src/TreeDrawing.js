import * as d3 from 'd3';
export const drawCyclicTree = async (cyclicTreeRef, data) => {
    const clockRadius = 120;

    const treeHeight = 500;
    const treeWidth = 500;
    const centerY = treeHeight / 2;
    const centerX = treeWidth / 2;
    const top = centerY + 70;
    const bottom = centerY + 240;
    const left = centerX - 50;
    const right = centerY + 50;
    const midY = top + (bottom - top) / 2;

    const leftCurveData = [
        { x: left + 20, y: top },
        { x: left + 35, y: midY },
        { x: left, y: bottom }
    ];

    const rightCurveData = [
        { x: right - 20, y: top },
        { x: right - 35, y: midY },
        { x: right, y: bottom }
    ];

    // const treeHeight = 500;
    // const treeWidth = 500;
    // const centerY = treeHeight / 2;
    // const centerX = treeWidth / 2;
    // const top = centerY + 50;
    // const bottom = centerY + 240;
    // const left = centerX - 50;
    // const right = centerY + 50;
    // const clockRadius = 120;
    /*
    const secondTickStart = clockRadius - 20;
    const secondTickLength = -10;
    const labelRadius = clockRadius + 16;
    const secondLabelYOffset = 5;

     */
    const radians = Math.PI / 180

    // const treeLineData = [
    //     { x: left + 20, y: top },
    //     { x: right - 20, y: top },
    //     { x: right, y: bottom },
    //     { x: left, y: bottom },
    //     { x: left + 20, y: top },
    // ]

    const svg = d3.select(cyclicTreeRef.current);
    svg.selectAll("*").remove();
    svg
        .attr('width', treeHeight)
        .attr('height', treeWidth);
    svg.append("g")

    // var treeLine = d3.line()
    //     .x((p) => p.x)
    //     .y((p) => p.y)
    //     .curve(d3.curveBumpX)
    //     .curve(d3.curveBumpY)

    // svg.append("path")
    //     .attr("d", treeLine(treeLineData))
    //     .attr("fill", "none")
    //     .attr("stroke", "brown");

    var treeLine = d3.line()
        .x((p) => p.x)
        .y((p) => p.y)
        .curve(d3.curveBasis)

    // left curve for tree trunk
    svg.append("path")
        .datum(leftCurveData)
        .attr("d", treeLine)
        .attr("fill", "none")
        .attr("stroke", "#5C4033")
        .attr("stroke-width", 2)
        .attr("transform", `translate(0, 65)`);

    // right curve
    svg.append("path")
        .datum(rightCurveData)
        .attr("d", treeLine)
        .attr("fill", "none")
        .attr("stroke", "#5C4033")
        .attr("stroke-width", 2)
        .attr("transform", `translate(0, 65)`);

    const r = d3.scaleSqrt([0, d3.max(data.deltaEncoding, d => Math.abs(d.delta))], [0, 12]).clamp(true)
    const filteredDays = data.deltaEncoding.filter((day) => (new Date(day.timestamp).getDate()) === new Date("April 08, 2026").getDate())

    // svg.append("rect")
    //     .attr("x", left)
    //     .attr("y", centerY - 20)
    //     .attr("width", 100)
    //     .attr("height", 100)
    //     .attr("fill", "white");

    svg.append("g")
        .selectAll("path")
        .data(filteredDays)
        .enter()
        .append("path")
        .attr("fill", "#69b3a2")
        .attr("d", d3.arc()
            .innerRadius(clockRadius))

    const g = svg.append("g")
        .attr("transform", `translate(${centerX}, ${centerY - 20})`);

    const twentyfourHours = d3
        .scaleLinear()
        .range([0, 360])
        .domain([0, 24]);

    const color = d3.scaleSequential()
        .domain([0, d3.max(filteredDays, d => d.delta)])
        .interpolator(d3.interpolateGreens);

    g.selectAll(".hour-data")
        .data(filteredDays)
        .enter()
        .append("circle")
        .attr("cx", d => clockRadius * Math.sin(twentyfourHours(new Date(d.timestamp).getHours()) * radians))
        .attr("cy", d => -clockRadius * Math.cos(twentyfourHours(new Date(d.timestamp).getHours()) * radians) + 5)
        .attr("r", d => r(d.delta))
        .attr("fill", d => color(d.delta))
        .attr("opacity", 0.7)


    g.selectAll(".hour-label")
        .data(filteredDays)
        .enter()
        .append("text")
        .attr("text-anchor", "middle")
        .attr("x", d => 150 * Math.sin(twentyfourHours(new Date(d.timestamp).getHours()) * radians))
        .attr("y", d => -150 * Math.cos(twentyfourHours(new Date(d.timestamp).getHours()) * radians) + 5)
        .text(d => new Date(d.timestamp).getHours() + ":00")
        .text(d => { // AM PM format for shorter labels
            const h = new Date(d.timestamp).getHours();
            const ampm = h >= 12 ? 'PM' : 'AM';
            const hour12 = h % 12 || 12;
            return `${hour12} ${ampm}`;
        })
        .style("font-size", "12px");

    /*
    g.selectAll(".hour-tick")
        .data(d3.range(0, 24))
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", secondTickStart)
        .attr("y2", secondTickStart + secondTickLength)
        .attr("stroke", "black")
        .attr("transform", d => `rotate(${twentyfourHours(d)})`);

             */

}
export const drawStandardTree = async (treeRef, data, weeklyConstraints) => {
    const treeHeight = 500;
    const treeWidth = 500;
    const centerY = treeHeight / 2;
    const centerX = treeWidth / 2;
    const top = centerY + 70;
    const bottom = centerY + 240;
    const left = centerX - 50;
    const right = centerY + 50;
    const midY = top + (bottom - top) / 2;

    const leftCurveData = [
        { x: left + 20, y: top },
        { x: left + 35, y: midY },
        { x: left, y: bottom }
    ];

    const rightCurveData = [
        { x: right - 20, y: top },
        { x: right - 35, y: midY },
        { x: right, y: bottom }
    ];
    const svg = d3.select(treeRef.current);
    svg.selectAll("*").remove();
    svg
        .attr('width', treeHeight)
        .attr('height', treeWidth);
    svg.append("g")

    /*
    const treeGroup = svg.append("g")
        .attr("width", 100)
        .attr("height", 100)

     */

    var treeLine = d3.line()
        .x((p) => p.x)
        .y((p) => p.y)
        .curve(d3.curveBasis)

    // left curve for tree trunk
    svg.append("path")
        .datum(leftCurveData)
        .attr("d", treeLine)
        .attr("fill", "none")
        .attr("stroke", "#5C4033")
        .attr("stroke-width", 2)
        .attr("transform", `translate(0, 60)`);

    // right curve
    svg.append("path")
        .datum(rightCurveData)
        .attr("d", treeLine)
        .attr("fill", "none")
        .attr("stroke", "#5C4033")
        .attr("stroke-width", 2)
        .attr("transform", `translate(0, 60)`);

    const r = d3.scaleSqrt([0, d3.max(data.deltaEncoding, d => Math.abs(d.delta))], [0, 12]).clamp(true)
    const pack = d3.pack()
        .size([treeWidth - weeklyConstraints.marginLeft * 6, weeklyConstraints.height - weeklyConstraints.marginTop * 6])
        .radius(d => r(d.value))
        .padding(4);
    const filteredDays = data.deltaEncoding.filter((day) => (new Date(day.timestamp).getUTCDate()) === new Date("April 04, 2026").getUTCDate())


    const root = pack(d3.hierarchy({ children: data.deltaEncoding })
        .sum(d => d.delta))

    svg.append("rect")
        .attr("x", left)
        .attr("y", centerY - 20)
        .attr("width", 100)
        .attr("height", 100)
        .attr("fill", "white");

    const node = svg.append("g")
        .attr("transform", "translate(120, 40)")
        .selectAll()
        .data(root.leaves())
        .join("g")
        .attr("transform", d => `translate(${d.x},${d.y})`)

    const color = d3.scaleSequential()
        .domain([0, d3.max(filteredDays, d => d.delta)])
        .interpolator(d3.interpolateGreens);
    node.append("circle")
        .attr("fill-opacity", 0.7)
        .attr("fill", d => color(d.value))
        .attr("r", d => d.r);

}