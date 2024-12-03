// store/labsSlice.js
import { createSlice } from '@reduxjs/toolkit';
import DublinMap from '../assets/images/Dublin_LL.png';
import MadridMap from '../assets/images/Madrid_LL.png';
import PortoMap from '../assets/images/Porto_LL.png';
import AarhusMap from '../assets/images/Aarhus_LL.png';
import BrusselsMap from '../assets/images/Brussels_LL.png';
import PragueMap from '../assets/images/Prague_LL.png';


const initialState = {
  labs: [
    {
      id: 1,
      name: 'Dublin Living Lab',
      description: 'Dún Laoghaire-Rathdown County, DLR, is a coastal suburban town south-east of Dublin city and the traditional port of arrival of cross-channel ferries from Wales. It has the benefit of unparalleled access to public transport, employment opportunities, leisure facilities, education, shopping and an attractive public realm.',
      map: DublinMap,
    },
    {
      id: 2,
      name: 'Madrid Living Lab',
      description: 'Madrid New North (MNN) is a part of a public initiative of Madrid City Council aiming to regenerate 300 hectares of land in the North of the Spanish Capital and close the gap that Madrid has historically in that area due to the railway tracks that come out of Chamartin Station.',
      map: MadridMap,
    },
    {
      id: 3,
      name: 'Porto Living Lab',
      description: 'The Porto LL is the headquarters of Sonae in Portugal with a total area of 32,5 ha, receiving more than three thousand employees (Figure 17). The campus has several sustainable features such as efficient water solutions, solar energy production, electric mobility alternatives, LEED certified buildings. The construction area ...',
      map: PortoMap,
    },
    {
      id: 4,
      name: 'Aarhus Living Lab',
      description: 'One of the major challenges for the green transition in Aarhus is to translate sustainable ideas and research into concrete actions. Aarhus is a stronghold for innovation and architecture design industry. Connecting industry and research creates significant potential for a green transition with the focus on real and scalable actions...',
      map: AarhusMap,
    },
    {
      id: 5,
      name: 'Brussels Living Lab',
      description: 'The Living Lab building is De l’Autre Côté de l’Ecole (ACE) school building (Figure 36), home to a private school. ACE will be renovating 2000 m² out of their total school facilities to bring the areas into use for the educational needs of the school and in line with the latest environmental and regulatory requirements of the European Green Deal. This ...',
      map: BrusselsMap,
    },
    {
      id: 6,
      name: 'Prague Living Lab',
      description: 'The area of interest is located in the built-up part of the capital city of Prague, the local part of Dejvice. Dejvice is a North-West urban area of Prague built mainly in the first quarter of the 20th Century (Figure 43). Dejvice accommodates many embassies and the Czech Technical University in Prague (the oldest technical university in ...',
      map: PragueMap,
    },
    // Add more lab data as needed
  ],
};

const labsSlice = createSlice({
  name: 'labs',
  initialState,
  reducers: {},
});

export const selectLabs = (state) => state.labs.labs;

export default labsSlice.reducer;
