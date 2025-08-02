// js/pricing-tool/PricingToolPage.jsx
import React, { useState, useMemo } from 'react';
import ModelViewer from './components/ModelViewer';
import Customizer from './components/Customizer';

const materialOptions = [
    { id: 'plastic', name: 'Standard Plastic', priceModifier: 1.0 },
    { id: 'metal', name: 'Brushed Metal', priceModifier: 1.8 },
    { id: 'wood', name: 'Matte Wood', priceModifier: 1.5 },
];

const featureOptions = [
    { id: 'featureA', name: 'Engraving', price: 50 },
    { id: 'featureB', name: 'LED Inserts', price: 120 },
];

/**
 * The main page component for the interactive pricing tool.
 * It manages the state of the product configuration and calculates the price.
 */
export default function PricingToolPage() {
    // State for the product's customizable properties
    const [color, setColor] = useState('#4a90e2'); // Default to a nice blue
    const [material, setMaterial] = useState(materialOptions[0]);
    const [features, setFeatures] = useState(new Set());

    const handleFeatureToggle = (featureId) => {
        setFeatures(prevFeatures => {
            const newFeatures = new Set(prevFeatures);
            if (newFeatures.has(featureId)) {
                newFeatures.delete(featureId);
            } else {
                newFeatures.add(featureId);
            }
            return newFeatures;
        });
    };

    // Memoized price calculation
    const price = useMemo(() => {
        const basePrice = 250; // The starting price of the base model
        const materialCost = basePrice * material.priceModifier;
        
        const featuresCost = Array.from(features).reduce((total, featureId) => {
            const feature = featureOptions.find(f => f.id === featureId);
            return total + (feature ? feature.price : 0);
        }, 0);

        return materialCost + featuresCost;
    }, [material, features]);

    const configuration = { color, material, features };

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <main className="flex flex-col lg:flex-row">
                {/* 3D Model Viewer Section (takes up most of the space) */}
                <div className="w-full lg:w-2/3 h-[50vh] lg:h-screen bg-gray-200">
                    <ModelViewer color={color} materialKey={material.id} />
                </div>

                {/* Customizer Sidebar */}
                <div className="w-full lg:w-1/3 lg:h-screen lg:overflow-y-auto p-6 md:p-8">
                    <Customizer
                        color={color}
                        setColor={setColor}
                        material={material}
                        setMaterial={setMaterial}
                        features={features}
                        handleFeatureToggle={handleFeatureToggle}
                        price={price}
                        configuration={configuration}
                        materialOptions={materialOptions}
                        featureOptions={featureOptions}
                    />
                </div>
            </main>
        </div>
    );
}