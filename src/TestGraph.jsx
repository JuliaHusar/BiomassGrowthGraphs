import './App.css'
import {useEffect, useRef, useState} from "react";
import * as d3 from 'd3';

const TestGraph = ({data, width = 600, height= 400, margin = {top: 20, right: 20, bottom: 20, left: 40}}) => {
    const ref = useRef();


    useEffect(() => {
        if (data.length === 0) return
        const months = (data.map(d => d.Month));
        const coPercentage = (data.map(d => d.Co2_Reduction_Percentage));
        const biomass = (data.map(d => d.Chlorococcum_dry_mass_mg_per_liter));

        const svg = d3.select(ref.current)
            .attr('width', width)
            .attr('height', height);

        const x = d3.scaleBand()
            .domain(data.map(d => d.Month))
            .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.Co2_Reduction_Percentage)]).nice()
            .range([height - margin.bottom, margin.top])

        const radius = d3.scaleSqrt()
            .domain([0, d3.max(data, d => d.Chlorococcum_dry_mass_mg_per_liter)])
            .range([0, 20])

        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x))

        svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y))

        svg.selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.Month) + x.bandwidth() / 2)
            .attr('cy', d => y(d.Co2_Reduction_Percentage))
            .attr('r', d => radius(d.Chlorococcum_dry_mass_mg_per_liter))
            .attr('fill', 'steelblue')

        }, [data]);

    return <svg ref={ref}></svg>

}
export default TestGraph;