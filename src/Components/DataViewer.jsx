import {filterWeekData} from "./Math/HelperFunctions.js";
import {useRef} from "react";

const DataViewer = ({selectedDaypartRef, selectedWeekPartRef, data, granularity}) => {
    if (granularity === 24) selectedDaypartRef.current = []
    const selectedData = filterWeekData(selectedDaypartRef, data.weeklyData)

    return(
        <div>
            {granularity === 7 ?
                <div>
                    {selectedData.start.toString()}{selectedData.end.toString()}
                </div>
                    /*
                <div>
                    {selectedData.filteredData.map((d) => (
                        <p key={d.timestamp}>{d.timestamp.toString()}</p>
                    ))}
                </div>
                */
                :
                <div>

                </div>
            }
        </div>
    )

}
export default DataViewer;
