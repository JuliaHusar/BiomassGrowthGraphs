import { useEffect, useState } from "react";

const Header = () => {
    const [currentPage, setCurrentPage] = useState(window.location.pathname);

    const isCurrentPage = (path) => currentPage === path;

    useEffect(() => {
        const handleLocationChange = () => setCurrentPage(window.location.pathname);
        window.addEventListener('popstate', handleLocationChange);
        return () => window.removeEventListener('popstate', handleLocationChange);
    }, []);

    return (
        <div className='flex items-center font-medium space-x-10'>
            <div className='relative flex flex-col items-center'>
                <a href='/' onClick={() => setCurrentPage('/')}>General Information</a>
                {isCurrentPage('/') && <div className='w-4/5 h-0.5 bg-black mt-2'></div>}
            </div>
            <div className='relative flex flex-col items-center'>
                <a href='/PredictiveAnalysis' onClick={() => setCurrentPage('/PredictiveAnalysis')}>Predictive Analysis</a>
                {isCurrentPage('/PredictiveAnalysis') && <div className='w-4/5 h-0.5 bg-black mt-2'></div>}
            </div>
            <div className='relative flex flex-col items-center'>
                <a href='/HistoricData' onClick={() => setCurrentPage('/HistoricData')}>Historic Data</a>
                {isCurrentPage('/HistoricData') && <div className='w-4/5 h-0.5 bg-black mt-2'></div>}
            </div>
        </div>
    );
}

export default Header;