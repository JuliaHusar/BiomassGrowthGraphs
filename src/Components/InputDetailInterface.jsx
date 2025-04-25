import {useState} from "react";

const InputDetailInterface = () => {
    const nutrients = ["Nitrogen", "Phosphorus", "Potassium", "Calcium", "Magnesium", "Sulfur"];
    const [nutrientFrequency, setNutrientFrequency] = useState(null);
    const [nutrientList, setNutrientList] = useState([]);
    const [selectedView, setSelectedView] = useState('input');

    const handleSubmitData = () => {

    }

    const handleSelected = (event) => {
        const selected = event.target.innerText.toLowerCase();
        setSelectedView(selected);
    }

    const handleSelectNutrient = (event) => {
        const nutrient = event.target.id;
        const isChecked = event.target.checked;
        if (isChecked) {
            setNutrientList((prevList) => [...prevList, nutrient]);
        } else {
            setNutrientList((prevList) => prevList.filter((item) => item !== nutrient));
        }
        console.log(nutrientList);
    }

    const handleNutrientAmount = (event) => {
        const nutrient = event.target.id;
        const amount = event.target.value;
        setNutrientList((prevList) => {
            const index = prevList.findIndex((item) => item.id === nutrient);
            if (index !== -1) {
                const newList = [...prevList];
                newList[index].amount = amount;
                return newList;
            } else {
                return [...prevList, {id: nutrient, amount}];
            }
        });
        console.log(nutrientList);
    }

    const handleSelectNutrientFrequency = (event) => {
        setNutrientFrequency(event.target.value);
        console.log(event.target.value);
    }

    return(
        <div className='w-1/4 border-2 border-black rounded-lg'>
            <div id='infotab' className='flex flex-row flex-grow justify-evenly h-10'>
                <button className={selectedView === 'input' ?'bg-white w-1/2 h-full rounded-tl-md' : 'bg-gray-200 w-1/2 h-full rounded-tl-md'} onClick={handleSelected}>Input</button>
                <button className={selectedView === 'details' ?'bg-white w-1/2 h-full rounded-tr-md' : 'bg-gray-200 w-1/2 h-full rounded-tr-md'} onClick={handleSelected}>Details</button>
            </div>
            {selectedView === 'input' ?
                <div className='flex flex-col justify-start items-start p-5'>
                    <h3 className='mb-2 pt-2 self-center text-lg font-semibold'>Predictive Inputs</h3>
                    <h4 className='mt-5 mb-2 font-bold'>Inputs</h4>
                    <h4 className=''>Window Orientation</h4>
                    <input type="text" placeholder='Orientation in degrees'
                           className='border-2 border-gray-400 rounded-lg w-1/2 my-2 placeholder:pl-2'/>
                    <h4>Ambient Co2 in Room</h4>
                    <input type="text" placeholder='Co2 in PPM'
                           className='border-2 border-gray-400 rounded-lg w-1/2 my-2 placeholder:pl-2'/>
                    <h4>pH of Water</h4>
                    <input type="text" placeholder='pH of water'
                           className='border-2 border-gray-400 rounded-lg w-1/2 my-2 placeholder:pl-2'/>
                    <h4 className='mt-5 mb-2 font-bold'>Nutrients</h4>
                    <ul className='mb-5'>
                        {nutrients.map((nutrient, index) => (
                            <li key={index} className='flex flex-row items-center'>
                                <input onSelect={handleSelectNutrient} type="checkbox" id={nutrient} className='mr-2'/>
                                <label htmlFor={nutrient}>{nutrient}</label>
                                <input onChange={handleNutrientAmount} type="text" placeholder={`${nutrient} in PPM`}
                                       className='mx-2 border-2 border-gray-400 rounded-lg w-1/2 my-2 placeholder:pl-2'/>
                            </li>
                        ))}
                    </ul>
                    <h4 className='font-bold'>How often are nutrients given?</h4>
                    <div className='flex flex-row items-center mb-5'>
                        <input onSelect={handleSelectNutrientFrequency} type="radio" id="everyday" name="frequency"
                               value="everyday" className='mr-2'/>
                        <label htmlFor="everyday">Once a day</label>
                        <input onSelect={handleSelectNutrientFrequency} type="radio" id="everyweek" name="frequency"
                               value="everyweek" className='mx-2'/>
                        <label htmlFor="everyweek">Once a week</label>
                        <input onSelect={handleSelectNutrientFrequency} type="radio" id="everymonth" name="frequency"
                               value="everymonth" className='mx-2'/>
                        <label htmlFor="everymonth">Once a month</label>
                    </div>

                    <button className='self-center rounded-xl bg-green-200 p-2.5' onClick={handleSubmitData}>Predict
                        Output
                    </button>
                </div>
                :
                <div className='flex flex-col justify-start items-start p-5'>

                </div>
            }
        </div>
    )
}
export default InputDetailInterface;