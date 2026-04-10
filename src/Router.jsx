import {BrowserRouter, Route, Routes} from "react-router-dom";
import TreeVisualization from "./Pages/TreeVisualization.jsx";

const Router = () => {
    return(
        <BrowserRouter>
            <Routes>
                <Route path='/' element={<TreeVisualization/>}/>
            </Routes>
        </BrowserRouter>
    )
}

export default Router;