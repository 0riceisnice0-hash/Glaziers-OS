/**
 * GlazierOS 3D Pricing Wizard - Frontend Version
 * For use with [glazieros_pricing_tool] shortcode
 * 
 * @package GlazierOS
 * @version 2.0.0
 */

(function($, window, document) {
    'use strict';

    console.log('⚙️ pricing-wizard-frontend.js loaded');

    /**
     * Initialize pricing wizard when DOM is ready
     */
    $(document).ready(function() {
        const $container = $('#glazieros-pricing-tool');
        if (!$container.length) return;

        const wizard = new FrontendPricingWizard($container);
        wizard.init();
    });

    /**
     * Frontend Pricing Wizard Class
     */
    class FrontendPricingWizard {
        constructor($container) {
            this.$container = $container;
            this.step = 1;
            this.config = {
                productType: 'Window',
                material: 'uPVC',
                width: 1.5,
                height: 1.2,
                color: '#FFFFFF',
                glazingType: 'Double Glazed',
                frameStyle: 'Casement',
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                address: ''
            };
            this.basePrice = 250; // £250 per sqm
        }

        init() {
            this.render();
            this.attachHandlers();
            this.injectStyles();
        }

        calculatePrice() {
            const area = this.config.width * this.config.height;
            let price = area * this.basePrice;
            
            const materialMultipliers = {
                'uPVC': 1.0,
                'Aluminium': 1.4,
                'Timber': 1.6,
                'Composite': 1.5
            };
            
            price *= materialMultipliers[this.config.material] || 1.0;
            
            if (this.config.glazingType === 'Triple Glazed') {
                price += area * 50;
            } else if (this.config.glazingType === 'Acoustic Glazed') {
                price += area * 75;
            }
            
            return price.toFixed(2);
        }

        render() {
            const html = `
                <div class="gos-pricing-wizard-frontend">
                    <div class="gos-wizard-header">
                        <h2>Get Your Instant Quote</h2>
                        <p>Configure your perfect window or door in 3 simple steps</p>
                    </div>
                    
                    <div class="gos-wizard-progress">
                        <div class="gos-progress-step ${this.step >= 1 ? 'active' : ''}" data-step="1">
                            <div class="gos-progress-circle">1</div>
                            <span>Product</span>
                        </div>
                        <div class="gos-progress-line ${this.step >= 2 ? 'active' : ''}"></div>
                        <div class="gos-progress-step ${this.step >= 2 ? 'active' : ''}" data-step="2">
                            <div class="gos-progress-circle">2</div>
                            <span>Configure</span>
                        </div>
                        <div class="gos-progress-line ${this.step >= 3 ? 'active' : ''}"></div>
                        <div class="gos-progress-step ${this.step >= 3 ? 'active' : ''}" data-step="3">
                            <div class="gos-progress-circle">3</div>
                            <span>Contact</span>
                        </div>
                    </div>
                    
                    <div class="gos-wizard-body" id="gos-wizard-body-frontend">
                        ${this.renderStep()}
                    </div>
                    
                    <div class="gos-wizard-footer">
                        <div class="gos-wizard-price">
                            <span class="gos-price-label">Estimated Price:</span>
                            <span class="gos-price-value">£${this.calculatePrice()}</span>
                        </div>
                        <div class="gos-wizard-actions">
                            ${this.step > 1 ? '<button class="gos-btn-secondary" id="gos-wizard-prev-fe">Previous</button>' : ''}
                            ${this.step < 3 ? '<button class="gos-btn-primary" id="gos-wizard-next-fe">Next Step</button>' : 
                              '<button class="gos-btn-primary" id="gos-wizard-submit-fe">Get My Quote</button>'}
                        </div>
                    </div>
                </div>
            `;
            
            this.$container.html(html);
        }

        renderStep() {
            switch (this.step) {
                case 1:
                    return this.renderStep1();
                case 2:
                    return this.renderStep2();
                case 3:
                    return this.renderStep3();
                default:
                    return '';
            }
        }

        renderStep1() {
            return `
                <div class="gos-wizard-step">
                    <h3>Choose Your Product</h3>
                    <div class="gos-product-grid">
                        ${['Window', 'Door', 'Bifold Doors', 'Patio Doors', 'Conservatory'].map(type => `
                            <div class="gos-product-card ${this.config.productType === type ? 'selected' : ''}" 
                                 data-product="${type}">
                                <div class="gos-product-icon">${this.getProductIcon(type)}</div>
                                <div class="gos-product-name">${type}</div>
                                <div class="gos-product-desc">${this.getProductDescription(type)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        renderStep2() {
            return `
                <div class="gos-wizard-step gos-step-configure">
                    <div class="gos-3d-preview">
                        <div class="gos-3d-canvas">
                            ${this.render3DPreview()}
                        </div>
                        <div class="gos-preview-info">
                            <strong>${this.config.productType}</strong><br>
                            ${this.config.width.toFixed(2)}m × ${this.config.height.toFixed(2)}m = 
                            ${(this.config.width * this.config.height).toFixed(2)}m²
                        </div>
                    </div>
                    
                    <div class="gos-config-panel">
                        <h3>Customize Your ${this.config.productType}</h3>
                        
                        <div class="gos-config-group">
                            <label>Material</label>
                            <select id="gos-material-fe" class="gos-config-input">
                                ${['uPVC', 'Aluminium', 'Timber', 'Composite'].map(mat => 
                                    `<option value="${mat}" ${this.config.material === mat ? 'selected' : ''}>${mat}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="gos-config-group">
                            <label>Width (meters): <strong id="gos-width-display">${this.config.width.toFixed(2)}m</strong></label>
                            <input type="range" id="gos-width-fe" min="0.5" max="3.0" step="0.1" 
                                   value="${this.config.width}" class="gos-config-range">
                        </div>
                        
                        <div class="gos-config-group">
                            <label>Height (meters): <strong id="gos-height-display">${this.config.height.toFixed(2)}m</strong></label>
                            <input type="range" id="gos-height-fe" min="0.5" max="3.0" step="0.1" 
                                   value="${this.config.height}" class="gos-config-range">
                        </div>
                        
                        <div class="gos-config-group">
                            <label>Frame Color</label>
                            <div class="gos-color-picker">
                                <input type="color" id="gos-color-fe" value="${this.config.color}" class="gos-config-color">
                                <div class="gos-color-presets">
                                    ${['#FFFFFF', '#000000', '#8B4513', '#708090', '#2F4F4F'].map(color => 
                                        `<button class="gos-color-preset" data-color="${color}" 
                                                style="background-color: ${color}" title="${color}" type="button"></button>`
                                    ).join('')}
                                </div>
                            </div>
                        </div>
                        
                        <div class="gos-config-group">
                            <label>Glazing Type</label>
                            <select id="gos-glazing-fe" class="gos-config-input">
                                ${['Double Glazed', 'Triple Glazed', 'Acoustic Glazed'].map(glaz => 
                                    `<option value="${glaz}" ${this.config.glazingType === glaz ? 'selected' : ''}>${glaz}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                </div>
            `;
        }

        renderStep3() {
            return `
                <div class="gos-wizard-step">
                    <div class="gos-contact-form">
                        <h3>Request Your Quote</h3>
                        <p>Fill in your details and we'll send you a detailed quote</p>
                        
                        <div class="gos-form-row">
                            <div class="gos-form-field">
                                <label for="gos-first-name-fe">First Name *</label>
                                <input type="text" id="gos-first-name-fe" value="${this.config.firstName}" required>
                            </div>
                            <div class="gos-form-field">
                                <label for="gos-last-name-fe">Last Name *</label>
                                <input type="text" id="gos-last-name-fe" value="${this.config.lastName}" required>
                            </div>
                        </div>
                        
                        <div class="gos-form-row">
                            <div class="gos-form-field">
                                <label for="gos-email-fe">Email *</label>
                                <input type="email" id="gos-email-fe" value="${this.config.email}" required>
                            </div>
                            <div class="gos-form-field">
                                <label for="gos-phone-fe">Phone *</label>
                                <input type="tel" id="gos-phone-fe" value="${this.config.phone}" required>
                            </div>
                        </div>
                        
                        <div class="gos-form-field">
                            <label for="gos-address-fe">Installation Address (Optional)</label>
                            <textarea id="gos-address-fe" rows="2">${this.config.address}</textarea>
                        </div>
                    </div>
                    
                    <div class="gos-quote-summary">
                        <h4>Your Quote Summary</h4>
                        <div class="gos-summary-row">
                            <span>Product:</span>
                            <strong>${this.config.productType}</strong>
                        </div>
                        <div class="gos-summary-row">
                            <span>Material:</span>
                            <strong>${this.config.material}</strong>
                        </div>
                        <div class="gos-summary-row">
                            <span>Dimensions:</span>
                            <strong>${this.config.width.toFixed(2)}m × ${this.config.height.toFixed(2)}m</strong>
                        </div>
                        <div class="gos-summary-row">
                            <span>Glazing:</span>
                            <strong>${this.config.glazingType}</strong>
                        </div>
                        <div class="gos-summary-row gos-summary-total">
                            <span>Total Price:</span>
                            <strong>£${this.calculatePrice()}</strong>
                        </div>
                    </div>
                </div>
            `;
        }

        render3DPreview() {
            const width = this.config.width * 100;
            const height = this.config.height * 100;
            const viewBoxWidth = 400;
            const viewBoxHeight = 400;
            const centerX = viewBoxWidth / 2;
            const centerY = viewBoxHeight / 2;
            const rectWidth = Math.min(width, viewBoxWidth * 0.7);
            const rectHeight = Math.min(height, viewBoxHeight * 0.7);
            const x = centerX - rectWidth / 2;
            const y = centerY - rectHeight / 2;
            
            return `
                <svg viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" class="gos-3d-svg">
                    <rect x="${x + 10}" y="${y + 10}" width="${rectWidth}" height="${rectHeight}" 
                          fill="rgba(0,0,0,0.1)" rx="4"/>
                    <rect x="${x}" y="${y}" width="${rectWidth}" height="${rectHeight}" 
                          fill="${this.config.color}" stroke="#666" stroke-width="8" rx="4"/>
                    <rect x="${x + 15}" y="${y + 15}" width="${rectWidth - 30}" height="${rectHeight - 30}" 
                          fill="rgba(135, 206, 250, 0.3)" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
                    ${this.config.productType === 'Window' ? `
                        <line x1="${centerX}" y1="${y + 15}" x2="${centerX}" y2="${y + rectHeight - 15}" 
                              stroke="${this.config.color}" stroke-width="6"/>
                        <line x1="${x + 15}" y1="${centerY}" x2="${x + rectWidth - 15}" y2="${centerY}" 
                              stroke="${this.config.color}" stroke-width="6"/>
                    ` : ''}
                    <rect x="${x + 20}" y="${y + 20}" width="${rectWidth - 40}" height="${(rectHeight - 40) / 3}" 
                          fill="rgba(255,255,255,0.2)"/>
                </svg>
            `;
        }

        getProductIcon(type) {
            const icons = {
                'Window': '🪟',
                'Door': '🚪',
                'Bifold Doors': '🚪🚪',
                'Patio Doors': '🏠',
                'Conservatory': '🏛️'
            };
            return icons[type] || '📦';
        }

        getProductDescription(type) {
            const descriptions = {
                'Window': 'Perfect for any room',
                'Door': 'Entrance & interior doors',
                'Bifold Doors': 'Space-saving modern design',
                'Patio Doors': 'Connect indoor & outdoor',
                'Conservatory': 'Extend your living space'
            };
            return descriptions[type] || '';
        }

        attachHandlers() {
            // Product selection
            this.$container.on('click', '.gos-product-card', (e) => {
                const product = $(e.currentTarget).data('product');
                this.config.productType = product;
                this.updateStep();
            });
            
            // Configuration inputs
            this.$container.on('input', '#gos-width-fe', (e) => {
                this.config.width = parseFloat(e.target.value);
                $('#gos-width-display').text(this.config.width.toFixed(2) + 'm');
                this.updatePreview();
            });
            
            this.$container.on('input', '#gos-height-fe', (e) => {
                this.config.height = parseFloat(e.target.value);
                $('#gos-height-display').text(this.config.height.toFixed(2) + 'm');
                this.updatePreview();
            });
            
            this.$container.on('input change', '#gos-color-fe', (e) => {
                this.config.color = e.target.value;
                this.updatePreview();
            });
            
            this.$container.on('click', '.gos-color-preset', (e) => {
                this.config.color = $(e.currentTarget).data('color');
                $('#gos-color-fe').val(this.config.color);
                this.updatePreview();
            });
            
            this.$container.on('change', '#gos-material-fe', (e) => {
                this.config.material = e.target.value;
                this.updatePrice();
            });
            
            this.$container.on('change', '#gos-glazing-fe', (e) => {
                this.config.glazingType = e.target.value;
                this.updatePrice();
            });
            
            // Customer inputs
            this.$container.on('input', '#gos-first-name-fe', (e) => this.config.firstName = e.target.value);
            this.$container.on('input', '#gos-last-name-fe', (e) => this.config.lastName = e.target.value);
            this.$container.on('input', '#gos-email-fe', (e) => this.config.email = e.target.value);
            this.$container.on('input', '#gos-phone-fe', (e) => this.config.phone = e.target.value);
            this.$container.on('input', '#gos-address-fe', (e) => this.config.address = e.target.value);
            
            // Navigation
            this.$container.on('click', '#gos-wizard-next-fe', () => {
                this.step++;
                this.updateStep();
            });
            
            this.$container.on('click', '#gos-wizard-prev-fe', () => {
                this.step--;
                this.updateStep();
            });
            
            // Submit
            this.$container.on('click', '#gos-wizard-submit-fe', () => {
                this.submitQuote();
            });
        }

        updateStep() {
            $('#gos-wizard-body-frontend').html(this.renderStep());
            this.updateProgress();
            this.updateButtons();
            this.updatePrice();
        }

        updatePreview() {
            $('.gos-3d-canvas').html(this.render3DPreview());
            $('.gos-preview-info').html(`
                <strong>${this.config.productType}</strong><br>
                ${this.config.width.toFixed(2)}m × ${this.config.height.toFixed(2)}m = 
                ${(this.config.width * this.config.height).toFixed(2)}m²
            `);
            this.updatePrice();
        }

        updatePrice() {
            $('.gos-wizard-price .gos-price-value').text('£' + this.calculatePrice());
        }

        updateProgress() {
            $('.gos-progress-step').removeClass('active');
            $('.gos-progress-line').removeClass('active');
            for (let i = 1; i <= this.step; i++) {
                $(`.gos-progress-step[data-step="${i}"]`).addClass('active');
                if (i < this.step) {
                    $(`.gos-progress-line:nth-of-type(${i * 2})`).addClass('active');
                }
            }
        }

        updateButtons() {
            $('.gos-wizard-actions').html(`
                ${this.step > 1 ? '<button class="gos-btn-secondary" id="gos-wizard-prev-fe">Previous</button>' : ''}
                ${this.step < 3 ? '<button class="gos-btn-primary" id="gos-wizard-next-fe">Next Step</button>' : 
                  '<button class="gos-btn-primary" id="gos-wizard-submit-fe">Get My Quote</button>'}
            `);
        }

        async submitQuote() {
            if (!this.config.firstName || !this.config.lastName || !this.config.email || !this.config.phone) {
                alert('Please fill in all required fields (Name, Email, Phone)');
                return;
            }
            
            const quoteData = {
                first_name: this.config.firstName,
                last_name: this.config.lastName,
                email: this.config.email,
                phone: this.config.phone,
                address: this.config.address,
                type: this.config.productType,
                material: this.config.material,
                width: this.config.width,
                height: this.config.height,
                price: this.calculatePrice(),
                lead_status: 'New',
                install_status: 'Pending',
                notes: `Glazing: ${this.config.glazingType}\nFrame Color: ${this.config.color}`,
                date: new Date().toISOString()
            };
            
            try {
                const response = await fetch('/wp-json/glazieros/v1/quote', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': wpApiSettings.nonce
                    },
                    body: JSON.stringify(quoteData)
                });
                
                if (!response.ok) throw new Error('Failed to submit quote');
                
                const result = await response.json();
                
                // Extract ID from WordPress post object
                const quoteId = result.id || result.ID || result.post_id || 'N/A';
                
                // Show success message
                this.$container.html(`
                    <div class="gos-success-message">
                        <div class="gos-success-icon">✓</div>
                        <h2>Quote Submitted Successfully!</h2>
                        <p>Thank you ${this.config.firstName}! Your quote reference is <strong>#${quoteId}</strong></p>
                        <p>We'll contact you shortly at <strong>${this.config.email}</strong></p>
                        <div class="gos-success-summary">
                            <h4>Your Quote: £${this.calculatePrice()}</h4>
                            <p>${this.config.productType} - ${this.config.material} - ${this.config.width}m × ${this.config.height}m</p>
                        </div>
                        <button class="gos-btn-primary" onclick="location.reload()">Create Another Quote</button>
                    </div>
                `);
                
            } catch (error) {
                console.error('Error submitting quote:', error);
                alert('Failed to submit quote. Please try again or contact us directly.');
            }
        }

        injectStyles() {
            if ($('#gos-pricing-wizard-frontend-styles').length) return;
            
            const css = `
                .gos-pricing-wizard-frontend {
                    max-width: 1200px;
                    margin: 2rem auto;
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                
                .gos-wizard-header {
                    padding: 2rem;
                    background: linear-gradient(135deg, #4e73df 0%, #224abe 100%);
                    color: #fff;
                    text-align: center;
                }
                
                .gos-wizard-header h2 {
                    margin: 0 0 0.5rem 0;
                    font-size: 2rem;
                }
                
                .gos-wizard-header p {
                    margin: 0;
                    opacity: 0.9;
                }
                
                .gos-wizard-progress {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    background: #f8f9fa;
                }
                
                .gos-progress-step {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    color: #6c757d;
                }
                
                .gos-progress-step.active {
                    color: #4e73df;
                }
                
                .gos-progress-circle {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: #e1e4e8;
                    color: #6c757d;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 1.25rem;
                }
                
                .gos-progress-step.active .gos-progress-circle {
                    background: #4e73df;
                    color: #fff;
                }
                
                .gos-progress-line {
                    width: 100px;
                    height: 3px;
                    background: #e1e4e8;
                }
                
                .gos-progress-line.active {
                    background: #4e73df;
                }
                
                .gos-wizard-body {
                    padding: 2rem;
                    min-height: 400px;
                }
                
                .gos-wizard-step h3 {
                    margin: 0 0 1.5rem 0;
                    color: #2c3e50;
                    font-size: 1.5rem;
                }
                
                .gos-product-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 1.5rem;
                }
                
                .gos-product-card {
                    padding: 2rem 1.5rem;
                    border: 3px solid #e1e4e8;
                    border-radius: 12px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .gos-product-card:hover {
                    border-color: #4e73df;
                    transform: translateY(-4px);
                    box-shadow: 0 6px 20px rgba(78, 115, 223, 0.2);
                }
                
                .gos-product-card.selected {
                    border-color: #4e73df;
                    background: #f0f4ff;
                }
                
                .gos-product-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                
                .gos-product-name {
                    font-weight: 600;
                    color: #2c3e50;
                    margin-bottom: 0.5rem;
                }
                
                .gos-product-desc {
                    font-size: 0.875rem;
                    color: #6c757d;
                }
                
                .gos-step-configure {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr;
                    gap: 2rem;
                }
                
                .gos-3d-preview {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 12px;
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                
                .gos-3d-canvas {
                    width: 100%;
                    aspect-ratio: 1;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    margin-bottom: 1rem;
                }
                
                .gos-3d-svg {
                    width: 100%;
                    height: 100%;
                }
                
                .gos-preview-info {
                    color: #fff;
                    text-align: center;
                    font-size: 1.125rem;
                }
                
                .gos-config-group {
                    margin-bottom: 1.5rem;
                }
                
                .gos-config-group label {
                    display: block;
                    margin-bottom: 0.75rem;
                    font-weight: 500;
                    color: #2c3e50;
                }
                
                .gos-config-input,
                .gos-config-range {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: 2px solid #e1e4e8;
                    border-radius: 8px;
                    font-size: 1rem;
                }
                
                .gos-config-range {
                    padding: 0;
                }
                
                .gos-color-picker {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .gos-config-color {
                    width: 100%;
                    height: 50px;
                    border: 2px solid #e1e4e8;
                    border-radius: 8px;
                    cursor: pointer;
                }
                
                .gos-color-presets {
                    display: flex;
                    gap: 0.75rem;
                }
                
                .gos-color-preset {
                    width: 40px;
                    height: 40px;
                    border: 2px solid #e1e4e8;
                    border-radius: 6px;
                    cursor: pointer;
                }
                
                .gos-color-preset:hover {
                    border-color: #4e73df;
                    transform: scale(1.1);
                }
                
                .gos-contact-form {
                    max-width: 600px;
                    margin: 0 auto 2rem auto;
                }
                
                .gos-form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                
                .gos-form-field {
                    display: flex;
                    flex-direction: column;
                }
                
                .gos-form-field label {
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    color: #2c3e50;
                }
                
                .gos-form-field input,
                .gos-form-field textarea {
                    padding: 0.75rem 1rem;
                    border: 2px solid #e1e4e8;
                    border-radius: 8px;
                    font-size: 1rem;
                }
                
                .gos-quote-summary {
                    max-width: 600px;
                    margin: 2rem auto 0 auto;
                    padding: 2rem;
                    background: #f8f9fa;
                    border-radius: 12px;
                }
                
                .gos-quote-summary h4 {
                    margin: 0 0 1rem 0;
                    color: #2c3e50;
                }
                
                .gos-summary-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid #e1e4e8;
                }
                
                .gos-summary-total {
                    border-bottom: none;
                    padding-top: 1rem;
                    font-size: 1.25rem;
                    color: #4e73df;
                }
                
                .gos-wizard-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 2rem;
                    background: #f8f9fa;
                    border-top: 2px solid #e1e4e8;
                }
                
                .gos-wizard-price {
                    display: flex;
                    flex-direction: column;
                }
                
                .gos-price-label {
                    font-size: 0.875rem;
                    color: #6c757d;
                }
                
                .gos-price-value {
                    font-size: 2rem;
                    font-weight: 700;
                    color: #28a745;
                }
                
                .gos-wizard-actions {
                    display: flex;
                    gap: 1rem;
                }
                
                .gos-btn-primary,
                .gos-btn-secondary {
                    padding: 0.875rem 2rem;
                    border: none;
                    border-radius: 8px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .gos-btn-primary {
                    background: #4e73df;
                    color: #fff;
                }
                
                .gos-btn-primary:hover {
                    background: #2e59d9;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(78, 115, 223, 0.3);
                }
                
                .gos-btn-secondary {
                    background: #fff;
                    color: #6c757d;
                    border: 2px solid #e1e4e8;
                }
                
                .gos-btn-secondary:hover {
                    border-color: #4e73df;
                    color: #4e73df;
                }
                
                .gos-success-message {
                    text-align: center;
                    padding: 4rem 2rem;
                }
                
                .gos-success-icon {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: #28a745;
                    color: #fff;
                    font-size: 3rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 2rem auto;
                }
                
                .gos-success-summary {
                    margin: 2rem auto;
                    padding: 2rem;
                    background: #f8f9fa;
                    border-radius: 12px;
                    max-width: 500px;
                }
                
                @media (max-width: 768px) {
                    .gos-step-configure {
                        grid-template-columns: 1fr;
                    }
                    
                    .gos-product-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .gos-form-row {
                        grid-template-columns: 1fr;
                    }
                    
                    .gos-wizard-footer {
                        flex-direction: column;
                        gap: 1rem;
                    }
                }
            `;
            
            $('<style id="gos-pricing-wizard-frontend-styles"></style>').text(css).appendTo('head');
        }
    }

})(jQuery, window, document);
