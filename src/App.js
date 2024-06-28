// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './views/Login';
//import Navbar from './components/navbar'; // Make sure this path is correct

function App() {
  return (
    <Router>
      <div>
        {/*<Navbar />*/}
        <Routes>
          <Route path="/" element={<Login />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App
