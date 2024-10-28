// src/App.js
import React from 'react';
import HomePage from './pages/HomePage';
import './styles/App.css';

function App() {
  return (
    <div className="App">
      <header>
        <h1>Acme NPM Registry</h1>
      </header>
      <main>
        <HomePage />
      </main>
    </div>
  );
}

export default App;
