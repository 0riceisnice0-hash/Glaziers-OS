// js/pricing-tool/PricingToolPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import ModelViewer from './components/ModelViewer';
import Step1_ProductSelection from './components/Step1_ProductSelection';
import Step2_Configurator from './components/Step2_Configurator';
import Step3_Review from './components/Step3_Review';

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
    const [step, setStep] = useState(1);
    const [productType, setProductType] = useState(null);
    const [pricingRules, setPricingRules] = useState([]);

    // State for the product's customizable properties
    const [width, setWidth] = useState(1000);
    const [height, setHeight] = useState(1000);
    const [color, setColor] = useState('#4a90e2'); // Default to a nice blue
    const [material, setMaterial] = useState(materialOptions[0]);
    const [features, setFeatures] = useState(new Set());

    useEffect(() => {
        fetch('/wp-json/glazieros/v1/pricing-rules')
            .then(res => res.json())
            .then(data => setPricingRules(data));
    }, []);

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
        const rule = pricingRules.find(r => r.product_type === productType);
        const basePrice = rule ? rule.base_price : 0;
        const pricePerSqm = rule ? rule.price_per_sqm : 0;
        const area = (width / 1000) * (height / 1000);
        
        const materialCost = (basePrice + area * pricePerSqm) * material.priceModifier;
        
        const featuresCost = Array.from(features).reduce((total, featureId) => {
            const feature = featureOptions.find(f => f.id === featureId);
            return total + (feature ? feature.price : 0);
        }, 0);

        return materialCost + featuresCost;
    }, [productType, width, height, material, features, pricingRules]);

    const configuration = { color, material, features, productType, width, height };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    if (step === 1) {
        return <Step1_ProductSelection setProductType={setProductType} nextStep={nextStep} />;
    }

    if (step === 2) {
        return (
            <div className="min-h-screen bg-gray-100 font-sans">
                <main className="flex flex-col lg:flex-row">
                    {/* 3D Model Viewer Section (takes up most of the space) */}
                    <div className="w-full lg:w-2/3 h-[50vh] lg:h-screen bg-gray-200">
                        <ModelViewer color={color} materialKey={material.id} productType={productType} width={width} height={height} />
                    </div>

                    {/* Customizer Sidebar */}
                    <div className="w-full lg:w-1/3 lg:h-screen lg:overflow-y-auto p-6 md:p-8">
                        <Step2_Configurator
                            width={width}
                            setWidth={setWidth}
                            height={height}
                            setHeight={setHeight}
                            color={color}
                            setColor={setColor}
                            material={material}
                            setMaterial={setMaterial}
                            features={features}
                            handleFeatureToggle={handleFeatureToggle}
                            price={price}
                            materialOptions={materialOptions}
                            featureOptions={featureOptions}
                            prevStep={prevStep}
                            nextStep={nextStep}
                        />
                    </div>
                </main>
            </div>
        );
    }

    if (step === 3) {
        return <Step3_Review price={price} configuration={configuration} prevStep={prevStep} />
    }
    
    return null;
}
