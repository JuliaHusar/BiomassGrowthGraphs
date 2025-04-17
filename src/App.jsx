import {useEffect, useState} from 'react'
import './App.css'
import * as d3 from 'd3'
import TestGraph from "./TestGraph.jsx";
import Papa from 'papaparse';
import Router from "./Router.jsx";

function App() {
    const [csvData, setCsvData] = useState([]);

    useEffect(() => {
        const getCSV = async () => {
            try{
                const response = await fetch ('/public/sample_month_data.csv')
                const text = await response.text();

                Papa.parse(text, {
                    complete: (results) => {
                       setCsvData(results.data)
                    },
                    header:true,
                    dynamicTyping: true,
                });
            } catch (error){
                console.log(error)
            }
        }
        getCSV().then(r => {
            console.log(r)
        });
    }, []);


  return (
    <div className=''>
        <Router/>
    </div>
  )
}

export default App
