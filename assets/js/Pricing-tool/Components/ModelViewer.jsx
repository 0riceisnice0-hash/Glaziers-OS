// js/pricing-tool/components/ModelViewer.jsx
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF } from '@react-three/drei';

/**
 * A component that loads and displays your 3D model.
 * You should replace the placeholder GLB file with your own model.
 * @param {string} color - The current color selected for the model.
 */
function Model({ color, materialKey, ...props }) {
    // Replace with the path to your model
    const { scene } = useGLTF('/your-model.glb');

    // This is a simple implementation. For complex models, you might need to
    // traverse the scene graph to apply materials to specific meshes.
    scene.traverse((child) => {
        if (child.isMesh) {
            // You can create different material effects here based on `materialKey`
            if (materialKey === 'metal') {
                child.material.metalness = 0.8;
                child.material.roughness = 0.2;
            } else {
                child.material.metalness = 0.1;
                child.material.roughness = 0.8;
            }
            child.material.color.set(color);
        }
    });

    return <primitive object={scene} {...props} />;
}

export default function ModelViewer({ color, materialKey }) {
    return (
        <Canvas dpr={[1, 2]} camera={{ fov: 45 }} style={{ position: "absolute" }}>
            <Suspense fallback={null}>
                <Stage environment="city" intensity={0.6}>
                    <Model color={color} materialKey={materialKey} />
                </Stage>
            </Suspense>
            <OrbitControls makeDefault autoRotate />
        </Canvas>
    );
}