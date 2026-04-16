import {filterWeekData} from "./Math/HelperFunctions.js";

const DataViewer = ({selectedDaypartRef, data, granularity}) => {
    if (granularity === 24) selectedDaypartRef.current = []
    const selectedData = filterWeekData(selectedDaypartRef, data.weeklyData)
    return(
        <div>
            {selectedData.filteredData.map((d) => (
                <p key={d.timestamp}>{d.timestamp.toString()}</p>
            ))}
        </div>
    )

}
export default DataViewer;
