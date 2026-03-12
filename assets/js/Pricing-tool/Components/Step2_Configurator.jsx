// js/pricing-tool/components/Step2_Configurator.jsx
import React from 'react';

export default function Step2_Configurator({
    width,
    setWidth,
    height,
    setHeight,
    color,
    setColor,
    material,
    setMaterial,
    features,
    handleFeatureToggle,
    price,
    materialOptions,
    featureOptions,
    prevStep,
    nextStep
}) {
    return (
        <div className="max-w-md mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Customize Your Product</h1>
                <p className="text-gray-600 mt-1">Select your options and get an instant price estimate.</p>
            </header>

            {/* -- Customization Options -- */}
            <div className="space-y-6">
                {/* Dimensions */}
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Dimensions</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="width" className="block text-sm font-medium text-gray-700">Width (mm)</label>
                            <input
                                id="width"
                                type="number"
                                value={width}
                                onChange={(e) => setWidth(Number(e.target.value))}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="height" className="block text-sm font-medium text-gray-700">Height (mm)</label>
                            <input
                                id="height"
                                type="number"
                                value={height}
                                onChange={(e) => setHeight(Number(e.target.value))}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Color Picker */}
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                    <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                    <input
                        id="color"
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-full h-10 p-1 border-gray-300 rounded-md cursor-pointer"
                    />
                </div>

                {/* Material Selector */}
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Material</h3>
                    <div className="space-y-2">
                        {materialOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => setMaterial(option)}
                                className={`w-full text-left p-3 rounded-md transition-all duration-200 ${material.id === option.id ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 hover:bg-gray-200'}`}
                            >
                                {option.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Feature Toggles */}
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Additional Features</h3>
                    <div className="space-y-2">
                         {featureOptions.map((feature) => (
                            <label key={feature.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md cursor-pointer">
                                <span className="text-gray-800">{feature.name} (+${feature.price})</span>
                                <input
                                    type="checkbox"
                                    checked={features.has(feature.id)}
                                    onChange={() => handleFeatureToggle(feature.id)}
                                    className="h-5 w-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* -- Price Display -- */}
            <div className="my-8 p-4 bg-white rounded-lg shadow-md border border-gray-200 flex justify-between items-center">
                <span className="text-lg font-medium text-gray-600">Estimated Price:</span>
                <span className="text-3xl font-bold text-gray-900">${price.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
                <button onClick={prevStep} className="gos-button">Back</button>
                <button onClick={nextStep} className="gos-button">Next</button>
            </div>
        </div>
    );
}