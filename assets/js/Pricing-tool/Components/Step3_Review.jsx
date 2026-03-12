// js/pricing-tool/components/Step3_Review.jsx
import React from 'react';
import { useForm } from 'react-hook-form';

export default function Step3_Review({
    price,
    configuration,
    prevStep
}) {
    const { register, handleSubmit, formState: { errors } } = useForm();

    const handleSave = (data, status) => {
        const submissionData = {
            ...data,
            type: configuration.productType,
            width: configuration.width,
            height: configuration.height,
            price: price,
            status: status,
            form_data: {
                ...data
            }
        };

        fetch(GlazierOS.quoteUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData)
        })
        .then(res => res.json())
        .then(result => {
            if (result.job_id) {
                alert(`Quote saved as ${status}!`);
            } else {
                throw new Error('Failed to save quote.');
            }
        })
        .catch(err => alert('Error: ' + err.message));
    };

    return (
        <div className="max-w-md mx-auto p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Review Your Quote</h1>
            </header>

            <div className="space-y-6">
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration Summary</h3>
                    <ul>
                        <li>Product: {configuration.productType}</li>
                        <li>Dimensions: {configuration.width}mm x {configuration.height}mm</li>
                        <li>Color: <span style={{ backgroundColor: configuration.color, padding: '0 1rem', borderRadius: '4px' }}></span></li>
                        <li>Material: {configuration.material.name}</li>
                        <li>Features: {Array.from(configuration.features).join(', ') || 'None'}</li>
                    </ul>
                </div>
            </div>

            {/* -- Price Display -- */}
            <div className="my-8 p-4 bg-white rounded-lg shadow-md border border-gray-200 flex justify-between items-center">
                <span className="text-lg font-medium text-gray-600">Total Price:</span>
                <span className="text-3xl font-bold text-gray-900">${price.toFixed(2)}</span>
            </div>

            {/* -- Contact Form -- */}
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Request a Formal Quote</h2>
                <form className="space-y-4">
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
                    <div className="flex justify-between">
                        <button type="button" onClick={handleSubmit(data => handleSave(data, 'draft'))} className="gos-button">
                            Save as Draft
                        </button>
                        <button type="button" onClick={handleSubmit(data => handleSave(data, 'publish'))} className="gos-button">
                            Submit Request
                        </button>
                    </div>
                </form>
            </div>
            <div className="mt-4">
                <button onClick={prevStep} className="gos-button">Back</button>
            </div>
        </div>
    );
}