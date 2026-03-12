// assets/js/pricing-tool/index.js
import React from 'react';
import ReactDOM from 'react-dom';
import PricingToolPage from './Components/PricingToolPage';

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('glazieros-pricing-tool');
    if (container) {
        ReactDOM.render(<PricingToolPage />, container);
    }
});
