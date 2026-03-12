// js/pricing-tool/components/Step1_ProductSelection.jsx
import React from 'react';

const productTypes = [
    { id: 'window', name: 'Window' },
    { id: 'door', name: 'Door' },
    { id: 'conservatory', name: 'Conservatory' },
];

export default function Step1_ProductSelection({ setProductType, nextStep }) {
    return (
        <div className="p-8">
            <h2 className="text-2xl font-bold mb-4">Select a Product</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {productTypes.map(product => (
                    <div 
                        key={product.id} 
                        className="border p-4 rounded-lg text-center cursor-pointer hover:bg-gray-200"
                        onClick={() => {
                            setProductType(product.id);
                            nextStep();
                        }}
                    >
                        <h3 className="text-xl">{product.name}</h3>
                    </div>
                ))}
            </div>
        </div>
    );
}
