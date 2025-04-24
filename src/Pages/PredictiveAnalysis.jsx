import {useEffect, useRef, useState} from "react";
import Papa from "papaparse";
import * as d3 from 'd3';
import {aggregateDataIntoDayParts, datesWithinRange} from "../HelperFunctions.js";
import PredictiveScatterplot from "../Components/PredictiveScatterplot.jsx";
import InputVariableInterface from "../Components/InputVariableInterface.jsx";

const PredictiveAnalysis = () => {
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedView, setSelectedView] = useState('input');

    const handleSelectMonth = (month) => {
        setSelectedMonth(month);
    }

    return(
        <div className='flex flex-row w-full'>
            <div className='w-'>
                {selectedView === 'input' ?
                    <InputVariableInterface/> :
                    <InputVariableInterface/>
                }
                <PredictiveScatterplot selectedMonth={selectedMonth} setSelectedMonth={handleSelectMonth}/>
            </div>
        </div>
    )
}
export default PredictiveAnalysis;