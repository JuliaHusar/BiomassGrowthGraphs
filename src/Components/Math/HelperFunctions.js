import * as d3 from 'd3';

export function convertToDate(dateString) {
    const dateObject = new Date(dateString);
    return dateObject.toLocaleDateString('en-US', {
        year: '2-digit',
        month: 'numeric',
        day: 'numeric'
    });
}
export function convertToHour(dateString) {
    const dateObject = new Date(dateString);
    return dateObject.toLocaleDateString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    });
}
export function datesWithinRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];

    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {

        dates.push(new Date(d).toDateString());
    }
    return dates;
}

export function aggregateDataIntoDayParts(dataType, granularity, date, data) {
    const filteredDates = data.filter((dataPoint) => {
        console.log(dataPoint)
        const sensorDate = new Date(dataPoint.LocalTime)
        const datePassed = date.toDateString();
        return sensorDate === datePassed;
    });
    console.log(filteredDates);
}

export function downloadSVG(ref){
    console.log("called")
    const mainSvgEl = ref.current;

    // const mainW = Number(mainSvgEl.getAttribute('width')) || mainSvgEl.clientWidth;
    const mainH = Number(mainSvgEl.getAttribute('height')) || mainSvgEl.clientHeight;

    const combined = d3.create('svg')
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')

    //.attr('width', margin.left + mainW)
    .attr('height', mainH);

    const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    // wrap.setAttribute('transform', `translate(${margin.left},0)`);
    Array.from(mainSvgEl.childNodes).forEach(n => wrap.appendChild(n.cloneNode(true)));
    combined.node().appendChild(wrap);


    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(combined.node());
    source = '<?xml version="1.0" standalone="no"?>\n' + source;
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
    document.getElementById('svg-download').setAttribute('href', url);
}

export function cleanUp(svg){
    svg.selectAll(".cells").remove();
    svg.selectAll(".week-clip").remove();
    svg.selectAll(".daypartRect").remove();
    svg.select(".threshold-line").transition().remove();
    svg.select(".x-axis").transition().remove();
    svg.select(".y-axis").transition().remove();
    svg.select(".input-line").transition().remove();
    svg.select(".output-line").transition().remove();
    svg.select(".output-line").transition().remove();
    svg.select(".selected-area").remove();
}

export function filterWeekData(selectedRef, data){
    let sortedArray = [...selectedRef.current].sort();
    const start = new Date(sortedArray[0]);
    const end = new Date(sortedArray[1]);
    return {filteredData: data.filter(d => d.timestamp > start && d.timestamp < end), start, end}
}
// for formatting time format on x-axis
export const customTimeFormat = (date) => {
    if (d3.utcDay(date) < date) {
        return d3.utcFormat("%-I %p")(date); // hour + am/pm
    } else { // at date boundaries
        return d3.utcFormat("%b %-d")(date); // month + day
    }
};

export const scaleBuilder = (airData, maxGap) => {
    if (airData.timeData.length === 0) return;
    const weeklyConstraints = {width: 1000, height: 500, marginTop:20, marginRight: 30, marginBottom: 30, marginLeft: 40}
    const hasNext = new Set(
        airData.weeklyData
            .slice(0, -1)
            .filter((d, i) => airData.weeklyData[i + 1].timestamp - d.timestamp <= maxGap)
            .map(d => d.timestamp)
    );
    hasNext.add(airData.weeklyData.at(-1).timestamp);

    const x = d3.scaleUtc(d3.extent(airData.weeklyData, d => d.timestamp), [weeklyConstraints.marginLeft, weeklyConstraints.width - weeklyConstraints.marginRight]);
    // start y-axis from 300 to make vis larger and patterns clearer
    const y = d3.scaleLinear([350, d3.max(airData.weeklyData, d => d.scd30_co2_ppm_input)], [weeklyConstraints.height - weeklyConstraints.marginTop, weeklyConstraints.marginBottom])
    // encode delta with circle area
    const r = d3.scaleSqrt([0, d3.max(airData.deltaEncoding, d => Math.abs(d.delta))], [0, 12]).clamp(true);
    const line = d3.line()
        .defined(d => !isNaN(d.timestamp) && hasNext.has(d.timestamp))
        .x(d => x(d.timestamp))
        .y(d => y(d.scd30_co2_ppm_input))

    const outputLine = d3.line()
        .defined(d => !isNaN(d.timestamp) && hasNext.has(d.timestamp))
        .x(d => x(d.timestamp))
        .y(d => y(d.scd30_co2_ppm_output))

    // for formatting time format on x-axis
    return { x, y, r, line, outputLine };
}