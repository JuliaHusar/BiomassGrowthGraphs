import * as d3 from 'd3';
export const drawCyclicTree = async (cyclicTreeRef, data) => {
    const clockRadius = 100;
    const treeHeight = 200;
    const treeWidth = 200;
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

    const radians = Math.PI / 180

    const dates = data.map((d) => new Date(d.timestamp).getDate())
    const r = d3.scaleSqrt([0, d3.max(data, d => Math.abs(d.delta))], [0, 12]).clamp(true)
    const treeBuckets = d3.group(
        data,
        d => {
            const t = d.timestamp;
            const dayStart = new Date(t);
            dayStart.setUTCDate(dayStart.getUTCDate())
            dayStart.setHours(0)
            return dayStart.toISOString().slice(0, 10)
        }
    )
    const col = d3.scaleBand()
        .domain([...treeBuckets.keys()])
        .range([0, 200])

    const svg = d3.select(cyclicTreeRef.current);

    svg.selectAll("*").remove();
    svg
        .attr('width', 2000)
        .attr('height', 2000);
    const treeContainer = svg.append("g").attr("class", "tree-container")
    const trees = treeContainer.selectAll('g.tree')
        .data([...treeBuckets.entries()])
        .join(enter => enter.append('g').attr('class', 'tree'))
        .attr('transform', ([day]) => `translate( ${col(day)*4}, 100)`);
    trees.each(function ([day, records]){
        const tree = d3.select(this);

        var treeLine = d3.line()
            .x((p) => p.x/1.5)
            .y((p) => p.y/1.5)
            .curve(d3.curveBasis)

        // left curve for tree trunk
        tree.append("path")
            .datum(leftCurveData)
            .attr("d", treeLine)
            .attr("fill", "none")
            .attr("stroke", "#5C4033")
            .attr("stroke-width", 2)
            .attr("transform", `translate(70, 0)`);

        // right curve
        tree.append("path")
            .datum(rightCurveData)
            .attr("d", treeLine)
            .attr("fill", "none")
            .attr("stroke", "#5C4033")
            .attr("stroke-width", 2)
            .attr("transform", `translate(70, 0)`);
        // svg.append("rect")
        //     .attr("x", left)
        //     .attr("y", centerY - 20)
        //     .attr("width", 100)
        //     .attr("height", 100)
        //     .attr("fill", "white");
        /*
        tree.append("g")
            .selectAll("path")
            .data(records)
            .enter()
            .append("path")
            .attr("fill", "#69b3a2")
            .attr("d", d3.arc()
                .innerRadius(clockRadius))

         */

        const g = tree.append("g")
            .attr("transform", `translate(${centerX+70}, ${centerY - 40})`);
        let filteredRecords = records.map((d) => d.delta)
        console.log(filteredRecords)
        g.append("circle")
            .attr("cx", -30)
            .attr("cy", -40)
            .attr("r", clockRadius/1.2)
            .attr("fill", "none")
            .attr("stroke", "#ccc")
            .attr("stroke-dasharray", "4,4")
            .style("pointer-events", "none");
        g.append("text")
            .attr("text-anchor", "middle")
            .attr("x", -30)
            .attr("y", -20)
            .text((Math.round((filteredRecords.reduce((sum, a) => sum + a, 0)) * 100)/100) + "co2 reduced")

        const twentyfourHours = d3
            .scaleLinear()
            .range([0, 360])
            .domain([0, 24]);

        const color = d3.scaleSequential()
            .domain([0, d3.max(records, d => d.delta)])
            .interpolator(d3.interpolateGreens);

        g.selectAll(".hour-data")
            .data(records)
            .enter()
            .append("circle")
            .attr("cx", d => clockRadius/1.2 * Math.sin(twentyfourHours(new Date(d.timestamp).getHours()) * radians)-30)
            .attr("cy", d => -clockRadius/1.2 * Math.cos(twentyfourHours(new Date(d.timestamp).getHours()) * radians)-40)
            .attr("r", d => r(d.delta))
            .attr("fill", d => color(d.delta))
            .attr("opacity", 0.7)

        g.selectAll(".hour-label")
            .data(records)
            .enter()
            .append("text")
            .attr("text-anchor", "middle")
            .attr("x", d => clockRadius * 1.1 * Math.sin(twentyfourHours(new Date(d.timestamp).getHours()) * radians)-30)
            .attr("y", d => -clockRadius * 1.1 * Math.cos(twentyfourHours(new Date(d.timestamp).getHours()) * radians) -40)
            .text(d => new Date(d.timestamp).getHours() + ":00")
            .text(d => { // AM PM format for shorter labels
                const h = new Date(d.timestamp).getHours();
                const ampm = h >= 12 ? 'PM' : 'AM';
                const hour12 = h % 12 || 12;
                return `${hour12} ${ampm}`;
            })
            .style("font-size", "12px");

    })

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