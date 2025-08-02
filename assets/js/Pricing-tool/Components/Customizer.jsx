// js/pricing-tool/components/Customizer.jsx
import React from 'react';
import { useForm } from 'react-hook-form';

/**
 * A UI component for customizing the 3D model's properties.
 * It also includes the price display and a quote request form.
 */
export default function Customizer({
    color,
    setColor,
    material,
    setMaterial,
    features,
    handleFeatureToggle,
    price,
    configuration,
    materialOptions,
    featureOptions
}) {
    const { register, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = (data) => {
        const submissionData = {
            ...data,
            configuration: {
                ...configuration,
                material: configuration.material.name, // send name instead of object
                features: Array.from(configuration.features),
            },
            totalPrice: price.toFixed(2),
        };
        console.log("Form Submitted!", submissionData);
        alert("Quote request sent! Check the console for the data.");
        // Here you would typically send `submissionData` to your backend API
    };

    return (
        <div className="max-w-md mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Customize Your Product</h1>
                <p className="text-gray-600 mt-1">Select your options and get an instant price estimate.</p>
            </header>

            {/* -- Customization Options -- */}
            <div className="space-y-6">
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

            {/* -- Contact Form -- */}
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Request a Formal Quote</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input type="text" id="name" {...register("name", { required: "Name is required" })} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input type="email" id="email" {...register("email", { required: "Email is required", pattern: { value: /^\S+@\S+$/i, message: "Invalid email address" } })} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                    </div>
                     <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700">Additional Notes</label>
                        <textarea id="message" {...register("message")} rows="3" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"></textarea>
                    </div>
                    <div>
                        <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Submit Request
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}