import {BrowserRouter, Route, Routes} from "react-router-dom";
import GeneralInformation from "./Pages/GeneralInformation.jsx";
import PredictiveAnalysis from "./Pages/PredictiveAnalysis.jsx";
import HistoricData from "./Pages/HistoricData.jsx";

const Router = () => {
    return(
        <BrowserRouter>
            <Routes>
                <Route path='/' element={<GeneralInformation/>}/>
                <Route path='/GeneralInformation' element={<GeneralInformation/>}/>
                <Route path='/PredictiveAnalysis' element={<PredictiveAnalysis/>}/>
                <Route path='/HistoricData' element={<HistoricData/>}/>
            </Routes>
        </BrowserRouter>
    )
}

export default Router;