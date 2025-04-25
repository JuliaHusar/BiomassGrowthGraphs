import {useRef} from "react";
import * as d3 from 'd3';

const ProgressGauge  = () => {
    const progressBarRef = useRef(null);
    const width = window.innerWidth;

    const svg = d3.select(progressBarRef.current)
        .attr("width", width - 1000)
        .attr("height", 100);

    svg.append("rect")
        .attr("x", 10)
        .attr("y", 10)
        .attr("width", width - 1020)
        .attr("height", 50)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("rx", 10);
    return(
        <div className='flex w-full justify-center items-center'>
            <svg ref={progressBarRef}></svg>
        </div>
    );
}
export default ProgressGauge;