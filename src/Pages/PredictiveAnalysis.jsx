import {useEffect, useRef, useState} from "react";
import Papa from "papaparse";
import * as d3 from 'd3';
import {aggregateDataIntoDayParts, datesWithinRange} from "../HelperFunctions.js";
import PredictiveScatterplot from "../Components/PredictiveScatterplot.jsx";
import InputDetailInterface from "../Components/InputDetailInterface.jsx";

const PredictiveAnalysis = () => {
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedView, setSelectedView] = useState('input');

    const handleSelectMonth = (month) => {
        setSelectedMonth(month);
    }

    return(
        <div className='flex flex-row w-full'>
            <InputDetailInterface/>
            <PredictiveScatterplot selectedMonth={selectedMonth} setSelectedMonth={handleSelectMonth}/>
        </div>
    )
}
export default PredictiveAnalysis;