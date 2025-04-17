import Router from "./Router.jsx";
import Header from "./Components/Header.jsx";

const Dashboard = () => {
    return(
        <div className=''>
            <div className='flex flex-col items-center w-full'>
                <Header/>
            </div>
            <div className='mt-10 h-full'>
                <Router/>
            </div>
            <div>
                {/* Footer component can be added here later :) */}
            </div>
        </div>
    );
}
export default Dashboard;