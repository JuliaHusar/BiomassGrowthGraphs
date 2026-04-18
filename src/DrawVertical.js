import * as d3 from "d3";

export const drawVertical = (airData, horizontalGraphRef, lightData, customTimeFormat) => {
    if (airData.timeData.length === 0) return;
    const constraints = {width: 1000, height: 750, marginTop:20, marginRight: 30, marginBottom: 30, marginLeft: 40}
    //TODO: add spacing + format these small multiples neatly
    //TODO: add cursor that shows comparisons between different days in a way that is intuitive.
    const svg = d3.select(horizontalGraphRef.current);

    const localTooltip = d3.select("body").append("div")
        .attr("class", "chart-tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid #ddd")
        .style("border-radius", "4px")
        .style("padding", "8px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    svg.selectAll("*").remove();
    svg.attr('width', constraints.width).attr('height', 1100);

    const maxGap = 15 * 60 * 1000;
    const hasNext = new Set(
        airData.weeklyData
            .slice(0, -1)
            .filter((d, i) => airData.weeklyData[i + 1].timestamp - d.timestamp <= maxGap)
            .map(d => d.timestamp)
    );
    hasNext.add(airData.weeklyData.at(-1).timestamp);

    const r = d3.scaleSqrt([0, d3.max(airData.deltaEncoding, d => Math.abs(d.delta))], [0, 12]).clamp(true);

    let dayBuckets = d3.group(
        airData.weeklyData,
        d => new Date(d.timestamp).toISOString().slice(0, 10)
    );
    // vertical line at date boundaries. commenting out for simplicity here
    /*
    svg.append("g")
        .attr("transform", `translate(0,${constraints.height - constraints.marginBottom})`)
        .call(
            d3.axisBottom(x)
                .ticks(d3.utcDay)
                .tickSize(-(constraints.height - constraints.marginTop - constraints.marginBottom))
                .tickFormat("")
        )
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line")
            .attr("stroke", "black")
            .attr("stroke-opacity", 0.06)
            .attr("stroke-width", 2.5)
        );

     */

    // what if we had like a sort of look up container where people could choose a date that they wanted to compare??? if we're really looking at user needs here

    const row = d3.scaleBand()
        .domain([...dayBuckets.keys()])
        .range([constraints.marginLeft, constraints.width - constraints.marginRight])
        .padding(0.05);

    const cellContainer = svg.append('g').attr('class', 'cells')
        .attr("height", constraints.height)
        .attr('transform', 'translate(50, 0)')

    const cells = cellContainer.selectAll('g.day-cell')
        .data([...dayBuckets.entries()])
        .join(enter => enter.append('g').attr('class', 'day-cell'))
        .attr('transform', ([day]) => `translate(0, ${row(day)})`);

    svg.append("defs").selectAll("clipPath.day-clip")
        .data([...dayBuckets.entries()])
        .join(enter => enter.append("clipPath").attr("class", "day-clip"))
        .attr("id", ([day]) => `clip-${day}`)
        .append("rect")
        .attr("x", 0)
        .attr("y", constraints.marginTop)
        .attr("width", constraints.width)
        .attr("height", constraints.height - constraints.marginTop - constraints.marginBottom);

    cells.each(function([day, records]) {
        const cell = d3.select(this);
        const bandwidth = constraints.width;

        const dayStart = new Date(day + "T00:00:00Z");
        const dayEnd = new Date(day + "T24:00:00Z");

        const xLocal = d3.scaleUtc()
            .domain([dayStart, dayEnd])
            .range([0, bandwidth]);

        //we want to get the overall max and keep y-axes consistent, or else people might misinterpret encodings
        //we could do this programatically but for simplicity's sake i'm doing it with 650 as that's a reasonable bound
        const newY = d3.scaleLinear(
            [350, 650],
            [(constraints.height/4 - constraints.marginTop), constraints.marginBottom * 2.2]
            //this controls the height of the individual cells that we're plotting. we can play around with it?
        );

        const localLine = d3.line()
            .x(d => xLocal(d.timestamp))
            .y(d => newY(d.scd30_co2_ppm_input));

        const localOutputLine = d3.line()
            .x(d => xLocal(d.timestamp))
            .y(d => newY(d.scd30_co2_ppm_output));

        cell.append("g")
            .attr('class', 'cell-y-axis')
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line").clone()
                .attr("x2", constraints.width - constraints.marginLeft - constraints.marginRight)
                .attr("stroke-opacity", 0.1))
            .call(d3.axisLeft(newY).ticks(bandwidth / 200));

        const filteredDay = lightData.aggregatedData
            .filter((d) => d.timestamp.toISOString().slice(0, 10) === day)

        const color = d3.scaleLog().domain([d3.min(filteredDay, d=> d.light_in),d3.max(lightData.aggregatedData, d => d.light_in)])
            .range(["#FFF8E1", "#FFECB3", "#FFE082", "#FFD54F", "#FFCA28"])

        cell.append("g")
            .attr("class", `light-day`)
            .attr("transform", `translate(0, ${constraints.marginBottom + 10})`)
            .selectAll("rect")
            .data(filteredDay)
            .join("rect")
            .attr("x", d => xLocal(d.timestamp))
            .attr("y", constraints.marginTop)
            .attr("width", xLocal(new Date(xLocal.domain()[0].getTime() + 60 * 60 * 1000)) - xLocal(xLocal.domain()[0]))
            .attr("height", constraints.height / 4 - constraints.marginTop - constraints.marginBottom * 2)
            .attr("fill", d => color(d.light_in))
            .attr("opacity", 0.5)
            .attr("clip-path", `url(#clip-${day})`)
            .attr("pointer-events", "none");

        cell.append("path")
            .attr("class", "input-line")
            .attr("fill", "none")
            .attr("clip-path", `url(#clip-${day})`)
            .attr("stroke", "#62a247")
            .attr("stroke-width", 1)
            .attr("d", localLine(records))


        cell.append("path")
            .attr("class", "output-line")
            .attr("fill", "none")
            .attr("clip-path", `url(#clip-${day})`)
            .attr("stroke", "#9FBC93")
            .attr("stroke-width", 1)
            .attr("d", localOutputLine(records))

        cell.append("g")
            .attr("class", "sequestration")
            .selectAll("circle")
            .data(airData.aggregatedWeeklyData.filter((d) => new Date(d.timestamp).getHours() !== 19)) //bcs of utc weirdness, this has to be 19
            .join("circle")
            .attr("cx", d => xLocal(d.timestamp))
            .attr("cy", d => newY(d.output))
            .attr("r", d => r(d.delta))
            .attr("fill", "#5bb335")
            .attr("opacity", 0.7)

        cell.append("g")
            .attr("transform", `translate(0, ${constraints.height/4 - constraints.marginBottom+10})`)
            .call(
                d3.axisBottom(xLocal)
                    .ticks(d3.utcHour.every(6)) // ticks every 6 hours
                    .tickFormat(customTimeFormat)
            )

        const cellOverlay = cell.append("rect")
            .attr("class", "cell-overlay")
            .attr("x", 0)
            .attr("y", constraints.marginTop)
            .attr("width", constraints.width)
            .attr("height", constraints.height - constraints.marginTop - constraints.marginBottom + 10)
            .attr("fill", "none")
            .attr("pointer-events", "all");

        const cellRule = svg.append("line")
            .attr("class", "cell-rule")
            .attr("y1", constraints.marginTop + 25)
            .attr("y2", constraints.height * 1.5)
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .attr("opacity", 1)
            .attr("z-index", 100)
            .style("pointer-events", "none")
            .style("display", "none");

        cellOverlay.on("mousemove", function(event) {
            const [mouseX] = d3.pointer(event);
            const timestamp = xLocal.invert(mouseX);
            const bisect = d3.bisector(d => d.timestamp).left;
            const index = bisect(airData.weeklyData, timestamp);
            const d = airData.weeklyData[index];

            if (d) {
                cellRule
                    .style("display", null)
                    .attr("x1", mouseX + constraints.marginLeft)
                    .attr("x2", mouseX + constraints.marginLeft);
                localTooltip
                    .style("opacity", 1)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px")
                    .html(`
                <div><strong>${d3.timeFormat("%b %d, %I:%M %p")(new Date(timestamp).setHours(new Date(timestamp).getHours()+4))}</strong></div>
                <div>Input: ${d.scd30_co2_ppm_input.toFixed(1)} ppm</div>
                <div>Output: ${d.scd30_co2_ppm_output.toFixed(1)} ppm</div>
            `);
            }

        });

        cellOverlay.on("mouseleave", function() {
            cellRule.style("display", "none");
            localTooltip.style("opacity", 0)
        });
    });
}