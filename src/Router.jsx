import {BrowserRouter, Route, Routes} from "react-router-dom";
import TreeVisualization from "./Pages/TreeVisualization.jsx";

const Router = () => {
    return(
        <BrowserRouter basename="/BiomassGrowthGraphs">
            <Routes>
                <Route path='/' element={<TreeVisualization/>}/>
            </Routes>
        </BrowserRouter>
    )
}

export default Router;