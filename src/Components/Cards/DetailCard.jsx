const DetailCard = ({date, rateOfChange, co2In, luxIn, co2Out}) => {
return(
    <div className='rounded-lg border-2 border-gray-600 w-full flex flex-col'>
        <div className='flex flex-row justify-between items-center bg-gray-200 rounded-t-lg p-2'>
            <h3 className='text-lg font-semibold'>General Statistics</h3>
        </div>
        <div className='flex flex-col p-5 items-start'>
            <h4 className='font-bold'>Date: {date}</h4>
            <p>Rate of Change: {rateOfChange}</p>
            <p>Co2 In: {co2In}</p>
            <p>Lux In: {luxIn}</p>
            <p>Co2 Out: {co2Out}</p>
        </div>
    </div>
);
}
export default DetailCard;