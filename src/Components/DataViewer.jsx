const DataViewer = ({selectedData}) => {
    return(
        <div>
            {selectedData.filteredData.map((d) => (
                <p>{d.timestamp.toString()}</p>
            ))}
        </div>
    )

}
export default DataViewer;
