
import { configureStore } from '@reduxjs/toolkit';
import loginReducer from '../reducers/loginReducer';
import neighbourhoodReducer from '../reducers/neighbourhoodReducer'; // Add this line
import labsReducer from '../reducers/labsReducer';
import co2Reducer from '../reducers/co2Reducer'
import dubElectricityReducer from '../reducers/dubElectricitySlice'
import dubGasReducer from '../reducers/dubGasSlice'
import lot2EnergyConsumpReducer from '../reducers/portoLot2ConsumptionSlice'
import lot4ProductionReducer from '../reducers/portoLot4ProductionSlice';
import downloadReducer from '../reducers/downloadSlice';
import dubGasoilReducer from '../reducers/dubGasoilSlice';
import dubKeroseneReducer from '../reducers/dubKeroseneSlice';
import dubLpgReducer from '../reducers/dubLpgSlice';
import dubPetrolReducer from '../reducers/dubPetrolSlice';
import dubRoadDieselReducer from '../reducers/dubRoadDieselSlice';
import dubSolarReducer from '../reducers/dubSolarSlice';
import dubWoodChips35Reducer from '../reducers/dubWoodChips35Slice';
import smartcitizenReducer from '../reducers/smartcitizenSlice';


const store = configureStore({
  reducer: {
    login: loginReducer,
    neighbourhood: neighbourhoodReducer, // Add this line
    labs: labsReducer,
    co2: co2Reducer,
    dubElectricity: dubElectricityReducer,
    dubGas : dubGasReducer,
    lot2Consumption   : lot2EnergyConsumpReducer,
    lot4Production: lot4ProductionReducer,
    download: downloadReducer,
    dubGasoil: dubGasoilReducer,
    dubKerosene: dubKeroseneReducer,
    dubLpg: dubLpgReducer,
    dubPetrol: dubPetrolReducer,
    dubRoadDiesel: dubRoadDieselReducer,
    dubSolar: dubSolarReducer,
    dubWoodChips35: dubWoodChips35Reducer,
    smartcitizen: smartcitizenReducer,
    

  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
});

export default store;
