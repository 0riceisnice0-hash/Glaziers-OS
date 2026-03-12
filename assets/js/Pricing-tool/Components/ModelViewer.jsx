// js/pricing-tool/components/ModelViewer.jsx
import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import * as THREE from 'three';

function Model({ productType, color, materialKey }) {
    const ref = useRef();

    useEffect(() => {
        const scene = ref.current;
        if (scene) {
            // Clear previous model
            while (scene.children.length > 0) {
                scene.remove(scene.children[0]);
            }

            let mesh;
            const builders = window.GOSBuilders || {};
            const builder = productType === 'door' ? builders.testdoor : builders.testwindow;

            if (builder) {
                mesh = builder({
                    width: 1,
                    height: 1.5,
                    frameDepth: 0.1,
                    frameThk: 0.05,
                    frameColor: new THREE.Color(color).getHex()
                });
            } else {
                // Placeholder for conservatory or if builder is not found
                const geometry = new THREE.BoxGeometry(1, 1.5, 1);
                const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(color) });
                mesh = new THREE.Mesh(geometry, material);
            }
            
            if (mesh) {
                scene.add(mesh);
            }
        }
    }, [productType, color, materialKey]);

    useFrame(() => {
        if (ref.current) {
            ref.current.rotation.y += 0.005;
        }
    });

    return <group ref={ref} />;
}

export default function ModelViewer({ color, materialKey, productType }) {
    return (
        <Canvas dpr={[1, 2]} camera={{ fov: 45 }} style={{ position: "absolute" }}>
            <Suspense fallback={null}>
                <Stage environment="city" intensity={0.6}>
                    <Model color={color} materialKey={materialKey} productType={productType} />
                </Stage>
            </Suspense>
            <OrbitControls makeDefault autoRotate />
        </Canvas>
    );
}
