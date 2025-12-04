/**
 * Noizes - White Noise & Ambient Sound Generator
 * A beautiful, calming audio experience
 */

class NoizeApp {
    constructor() {
        // Audio Context & Nodes
        this.audioContext = null;
        this.masterGain = null;
        this.noiseNode = null;
        this.filterNode = null;
        
        // State
        this.isPlaying = false;
        this.currentNoiseType = 'white';
        this.volume = 0.7;
        this.timerInterval = null;
        this.timerRemaining = 0;
        
        // DOM Elements
        this.masterToggle = document.getElementById('masterToggle');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeValue = document.getElementById('volumeValue');
        this.volumeFill = document.getElementById('volumeFill');
        this.timerDisplay = document.getElementById('timerDisplay');
        this.noiseCards = document.querySelectorAll('.noise-card');
        this.timerBtns = document.querySelectorAll('.timer-btn');
        this.canvas = document.getElementById('visualizer');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateVolumeFill();
        this.resizeCanvas();
        this.drawIdleVisualizer();
        
        // Set initial timer button state
        this.timerBtns[0].classList.add('active');
        
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            if (!this.isPlaying) this.drawIdleVisualizer();
        });
    }
    
    setupEventListeners() {
        // Master play/pause toggle
        this.masterToggle.addEventListener('click', () => this.togglePlay());
        
        // Volume control
        this.volumeSlider.addEventListener('input', (e) => {
            this.volume = e.target.value / 100;
            this.volumeValue.textContent = `${e.target.value}%`;
            this.updateVolumeFill();
            if (this.masterGain) {
                this.masterGain.gain.setTargetAtTime(this.volume, this.audioContext.currentTime, 0.1);
            }
        });
        
        // Noise type selection
        this.noiseCards.forEach(card => {
            card.addEventListener('click', () => {
                this.noiseCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.currentNoiseType = card.dataset.noise;
                if (this.isPlaying) {
                    this.stopNoise();
                    this.startNoise();
                }
            });
        });
        
        // Timer buttons
        this.timerBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.timerBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const minutes = parseInt(btn.dataset.minutes);
                this.setTimer(minutes);
            });
        });
    }
    
    updateVolumeFill() {
        const percentage = this.volumeSlider.value;
        this.volumeFill.style.width = `${percentage}%`;
    }
    
    async togglePlay() {
        if (this.isPlaying) {
            this.stop();
        } else {
            await this.play();
        }
    }
    
    async play() {
        try {
            // Initialize audio context on first play (required for browser autoplay policies)
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.audioContext.createGain();
                this.masterGain.connect(this.audioContext.destination);
                this.masterGain.gain.value = this.volume;
            }
            
            // Resume context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.startNoise();
            this.isPlaying = true;
            this.masterToggle.classList.add('playing');
            this.animateVisualizer();
        } catch (error) {
            console.error('Error starting audio:', error);
        }
    }
    
    stop() {
        this.stopNoise();
        this.isPlaying = false;
        this.masterToggle.classList.remove('playing');
        this.drawIdleVisualizer();
    }
    
    startNoise() {
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        switch (this.currentNoiseType) {
            case 'white':
                this.generateWhiteNoise(output);
                break;
            case 'pink':
                this.generatePinkNoise(output);
                break;
            case 'brown':
                this.generateBrownNoise(output);
                break;
            case 'rain':
                this.generateRainNoise(output);
                break;
            default:
                this.generateWhiteNoise(output);
        }
        
        this.noiseNode = this.audioContext.createBufferSource();
        this.noiseNode.buffer = noiseBuffer;
        this.noiseNode.loop = true;
        
        // Apply subtle filtering for smoother sound
        this.filterNode = this.audioContext.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = this.currentNoiseType === 'brown' ? 800 : 
                                          this.currentNoiseType === 'pink' ? 4000 : 
                                          this.currentNoiseType === 'rain' ? 3000 : 20000;
        
        this.noiseNode.connect(this.filterNode);
        this.filterNode.connect(this.masterGain);
        this.noiseNode.start();
    }
    
    stopNoise() {
        if (this.noiseNode) {
            this.noiseNode.stop();
            this.noiseNode.disconnect();
            this.noiseNode = null;
        }
        if (this.filterNode) {
            this.filterNode.disconnect();
            this.filterNode = null;
        }
    }
    
    generateWhiteNoise(output) {
        for (let i = 0; i < output.length; i++) {
            output[i] = Math.random() * 2 - 1;
        }
    }
    
    generatePinkNoise(output) {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < output.length; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
    }
    
    generateBrownNoise(output) {
        let lastOut = 0;
        for (let i = 0; i < output.length; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; // Boost volume
        }
    }
    
    generateRainNoise(output) {
        // Rain is a combination of pink noise with random "droplet" impulses
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < output.length; i++) {
            const white = Math.random() * 2 - 1;
            // Pink noise base
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            let pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
            b6 = white * 0.115926;
            
            // Add random droplets
            if (Math.random() < 0.001) {
                pink += (Math.random() - 0.5) * 0.5;
            }
            
            output[i] = pink;
        }
    }
    
    setTimer(minutes) {
        // Clear existing timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        if (minutes === 0) {
            this.timerDisplay.textContent = 'Off';
            this.timerRemaining = 0;
            return;
        }
        
        this.timerRemaining = minutes * 60;
        this.updateTimerDisplay();
        
        this.timerInterval = setInterval(() => {
            this.timerRemaining--;
            this.updateTimerDisplay();
            
            if (this.timerRemaining <= 0) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
                this.stop();
                this.timerBtns.forEach(b => b.classList.remove('active'));
                this.timerBtns[0].classList.add('active');
            }
        }, 1000);
    }
    
    updateTimerDisplay() {
        if (this.timerRemaining <= 0) {
            this.timerDisplay.textContent = 'Off';
            return;
        }
        
        const hours = Math.floor(this.timerRemaining / 3600);
        const minutes = Math.floor((this.timerRemaining % 3600) / 60);
        const seconds = this.timerRemaining % 60;
        
        if (hours > 0) {
            this.timerDisplay.textContent = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            this.timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }
    
    drawIdleVisualizer() {
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);
        
        // Draw a subtle wave pattern when idle
        const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.2)');
        gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.3)');
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0.2)');
        
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        const centerY = height / 2;
        const amplitude = 10;
        
        for (let x = 0; x <= width; x++) {
            const y = centerY + Math.sin(x * 0.02) * amplitude;
            if (x === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.stroke();
    }
    
    animateVisualizer() {
        if (!this.isPlaying) return;
        
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);
        
        // Create animated wave visualization
        const time = Date.now() * 0.002;
        const centerY = height / 2;
        
        // Multiple wave layers
        for (let layer = 0; layer < 3; layer++) {
            const opacity = 0.3 - layer * 0.08;
            const amplitude = 25 + layer * 10;
            const speed = 1 + layer * 0.3;
            const frequency = 0.015 - layer * 0.003;
            
            const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, `rgba(168, 85, 247, ${opacity})`);
            gradient.addColorStop(0.5, `rgba(99, 102, 241, ${opacity + 0.1})`);
            gradient.addColorStop(1, `rgba(236, 72, 153, ${opacity})`);
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2 - layer * 0.3;
            this.ctx.beginPath();
            
            for (let x = 0; x <= width; x++) {
                const noise = Math.sin(x * frequency + time * speed) * 
                             Math.cos(x * frequency * 0.5 + time * speed * 0.7) * 
                             this.volume;
                const randomWobble = Math.sin(time * 3 + x * 0.1) * 5 * this.volume;
                const y = centerY + noise * amplitude + randomWobble;
                
                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            
            this.ctx.stroke();
        }
        
        // Add floating particles
        this.drawParticles(time);
        
        requestAnimationFrame(() => this.animateVisualizer());
    }
    
    drawParticles(time) {
        const { width, height } = this.canvas;
        const particleCount = 15;
        
        for (let i = 0; i < particleCount; i++) {
            const x = (Math.sin(time * 0.5 + i * 0.7) * 0.3 + 0.5) * width;
            const y = (Math.cos(time * 0.3 + i * 1.1) * 0.3 + 0.5) * height;
            const size = 2 + Math.sin(time + i) * 1;
            const opacity = 0.3 + Math.sin(time * 2 + i) * 0.2;
            
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size * 2);
            gradient.addColorStop(0, `rgba(168, 85, 247, ${opacity})`);
            gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new NoizeApp();
});
