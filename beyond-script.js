// BEYOND Face Analysis Integration
// This script integrates the face analysis app with the BEYOND website

// Global variables
let video, canvas, ctx;
let startCameraBtn, analyzeBtn, captureBtn, retakeBtn;
let analysisSection;
let capturedImage = null;
let isAnalyzing = false;
let opencvReady = false;
let faceDetection = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Get elements
    video = document.getElementById('video');
    canvas = document.getElementById('output');
    ctx = canvas.getContext('2d');
    startCameraBtn = document.getElementById('startCamera');
    analyzeBtn = document.getElementById('analyzeBtn');
    captureBtn = document.getElementById('captureBtn');
    retakeBtn = document.getElementById('retakeBtn');
    analysisSection = document.getElementById('analysisSection');

    // Set up event listeners
    setupEventListeners();

    // Initialize OpenCV
    initializeOpenCV();
});

// Set up event listeners
function setupEventListeners() {
    startCameraBtn.addEventListener('click', startCamera);
    captureBtn.addEventListener('click', captureImage);
    analyzeBtn.addEventListener('click', analyzeSkin);
    retakeBtn.addEventListener('click', retakePhoto);
}

// Initialize OpenCV
function initializeOpenCV() {
    // Check if OpenCV is already loaded
    if (typeof cv !== 'undefined') {
        opencvReady = true;
        console.log('OpenCV is ready');
        return;
    }

    // Wait for OpenCV to load
    const checkOpenCV = setInterval(() => {
        if (typeof cv !== 'undefined') {
            opencvReady = true;
            console.log('OpenCV is ready');
            clearInterval(checkOpenCV);
        }
    }, 100);

    // Set up the callback for when OpenCV runtime initializes
    window.cv = window.cv || {};
    window.cv.onRuntimeInitialized = () => {
        opencvReady = true;
        console.log('OpenCV runtime initialized');
    };
}

// Start camera
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            }
        });

        video.srcObject = stream;
        video.play();

        startCameraBtn.disabled = true;
        startCameraBtn.textContent = '📹 Camera Active';

        // Enable capture button (face detection disabled due to MediaPipe issues)
        captureBtn.disabled = false;

        console.log('Camera started successfully');

    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Unable to access camera. Please check permissions.');
    }
}

// Capture image for analysis
function captureImage() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Get image data
    capturedImage = canvas.toDataURL('image/png');

    // Show analysis section
    analysisSection.style.display = 'block';
    analysisSection.classList.add('fade-in');

    // Enable analyze button
    analyzeBtn.disabled = false;

    // Update UI
    captureBtn.disabled = true;
    captureBtn.textContent = '✅ Captured';

    console.log('Image captured successfully');
}

// Analyze skin quality
async function analyzeSkin() {
    if (!capturedImage || isAnalyzing) return;

    isAnalyzing = true;
    showLoading(true);
    analyzeBtn.disabled = true;

    try {
        // Wait for OpenCV to be ready (with timeout)
        let attempts = 0;
        while (!opencvReady && attempts < 100) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!opencvReady) {
            throw new Error('OpenCV failed to load. Please refresh the page and try again.');
        }

        // Perform skin analysis
        const results = await performSkinAnalysis(capturedImage);

        // Display results
        displayResults(results);

    } catch (error) {
        console.error('Analysis error:', error);
        alert('Analysis failed: ' + error.message);
    } finally {
        isAnalyzing = false;
        showLoading(false);
        analyzeBtn.disabled = false;
    }
}

// Perform skin analysis using OpenCV.js
async function performSkinAnalysis(imageData) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
            // Create OpenCV Mat from image
            const src = cv.imread(img);

            // Convert to different color spaces for analysis
            const hsv = new cv.Mat();
            const gray = new cv.Mat();
            const lab = new cv.Mat();

            cv.cvtColor(src, hsv, cv.COLOR_RGB2HSV);
            cv.cvtColor(src, gray, cv.COLOR_RGB2GRAY);
            cv.cvtColor(src, lab, cv.COLOR_RGB2Lab);

            // Analyze different aspects of skin quality
            const smoothness = analyzeSmoothness(gray);
            const evenness = analyzeEvenness(lab);
            const clarity = analyzeClarity(hsv);

            // Calculate overall score
            const overallScore = Math.round((smoothness + evenness + clarity) / 3);

            // Clean up
            src.delete();
            hsv.delete();
            gray.delete();
            lab.delete();

            resolve({
                overall: overallScore,
                smoothness: smoothness,
                evenness: evenness,
                clarity: clarity
            });
        };
        img.src = imageData;
    });
}

// Analyze skin smoothness using texture analysis
function analyzeSmoothness(grayImage) {
    // Apply Gaussian blur and calculate difference for texture analysis
    const blurred = new cv.Mat();
    const diff = new cv.Mat();

    cv.GaussianBlur(grayImage, blurred, new cv.Size(15, 15), 0);
    cv.absdiff(grayImage, blurred, diff);

    // Calculate variance (higher variance = rougher texture)
    const mean = new cv.Mat();
    const stddev = new cv.Mat();
    cv.meanStdDev(diff, mean, stddev);

    const textureScore = Math.max(0, 100 - (stddev.data64F[0] * 2));

    // Clean up
    blurred.delete();
    diff.delete();
    mean.delete();
    stddev.delete();

    return Math.round(Math.max(0, Math.min(100, textureScore)));
}

// Analyze skin evenness using color distribution
function analyzeEvenness(labImage) {
    // Extract L channel (lightness)
    const channels = new cv.MatVector();
    cv.split(labImage, channels);
    const lChannel = channels.get(0);

    // Calculate standard deviation of lightness
    const mean = new cv.Mat();
    const stddev = new cv.Mat();
    cv.meanStdDev(lChannel, mean, stddev);

    // Lower standard deviation = more even skin tone
    const evennessScore = Math.max(0, 100 - (stddev.data64F[0] * 3));

    // Clean up
    channels.delete();
    lChannel.delete();
    mean.delete();
    stddev.delete();

    return Math.round(Math.max(0, Math.min(100, evennessScore)));
}

// Analyze skin clarity using HSV color space
function analyzeClarity(hsvImage) {
    // Extract S channel (saturation) for blemish detection
    const channels = new cv.MatVector();
    cv.split(hsvImage, channels);
    const sChannel = channels.get(1);

    // Apply threshold to detect dark spots (potential blemishes)
    const mask = new cv.Mat();
    cv.threshold(sChannel, mask, 30, 255, cv.THRESH_BINARY_INV);

    // Count non-zero pixels (potential blemishes)
    const blemishCount = cv.countNonZero(mask);
    const totalPixels = mask.rows * mask.cols;
    const blemishRatio = blemishCount / totalPixels;

    // Calculate clarity score (lower blemish ratio = clearer skin)
    const clarityScore = Math.max(0, 100 - (blemishRatio * 500));

    // Clean up
    channels.delete();
    sChannel.delete();
    mask.delete();

    return Math.round(Math.max(0, Math.min(100, clarityScore)));
}

// Display analysis results
function displayResults(results) {
    // Update score displays
    document.getElementById('overallScore').textContent = results.overall;
    document.getElementById('smoothnessScore').textContent = results.smoothness;
    document.getElementById('evennessScore').textContent = results.evenness;
    document.getElementById('clarityScore').textContent = results.clarity;

    // Update overall label
    const overallLabel = document.getElementById('overallLabel');
    if (results.overall >= 80) {
        overallLabel.textContent = 'Excellent';
        overallLabel.style.color = '#28a745';
    } else if (results.overall >= 60) {
        overallLabel.textContent = 'Good';
        overallLabel.style.color = '#ffc107';
    } else if (results.overall >= 40) {
        overallLabel.textContent = 'Fair';
        overallLabel.style.color = '#fd7e14';
    } else {
        overallLabel.textContent = 'Needs Attention';
        overallLabel.style.color = '#dc3545';
    }

    // Generate BEYOND-specific recommendations
    generateBeyondRecommendations(results);
}

// Generate personalized BEYOND recommendations
function generateBeyondRecommendations(results) {
    const recommendations = [];

    // Only recommend based on specific low scores (below 50 for more targeted recommendations)
    const smoothnessLow = results.smoothness < 50;
    const evennessLow = results.evenness < 50;
    const clarityLow = results.clarity < 50;
    const overallLow = results.overall < 50;

    // Smoothness recommendations - only if significantly low
    if (smoothnessLow) {
        recommendations.push({
            text: 'Focus on facial massage and Gua Sha techniques to improve skin texture and smoothness',
            program: 'Gua Sha Workshop',
            link: '#programs',
            priority: 1
        });
    }

    // Evenness recommendations - only if significantly low
    if (evennessLow) {
        recommendations.push({
            text: 'Try our Face Yoga sessions to improve circulation and skin tone evenness',
            program: 'Face Yoga Classes',
            link: '#programs',
            priority: 1
        });
    }

    // Clarity recommendations - only if significantly low
    if (clarityLow) {
        recommendations.push({
            text: 'Consider our One-to-One program for personalized blemish control and clarity techniques',
            program: 'One-to-One Programme',
            link: '#programs',
            priority: 1
        });
    }

    // Only add consultation if multiple areas need attention or overall is very low
    if ((smoothnessLow && evennessLow) || (evennessLow && clarityLow) || (smoothnessLow && clarityLow) || overallLow) {
        recommendations.push({
            text: 'Book a consultation to create a comprehensive BEYOND plan addressing multiple areas',
            program: 'Free Consultation',
            link: '#contact',
            priority: 2
        });
    }

    // Only add group workshops if overall is very low and no specific high-priority recommendations
    if (overallLow && recommendations.length === 0) {
        recommendations.push({
            text: 'Start with our Group Workshops to build a consistent routine',
            program: 'Group Workshops',
            link: '#programs',
            priority: 3
        });
    }

    // High score maintenance - only if overall is excellent
    if (results.overall >= 85) {
        recommendations.push({
            text: 'Excellent skin condition! Maintain your results with our advanced maintenance techniques',
            program: 'Advanced Workshops',
            link: '#programs',
            priority: 1
        });
    }

    // Sort by priority (lower number = higher priority)
    recommendations.sort((a, b) => a.priority - b.priority);

    // Limit to maximum 3 recommendations to keep it focused
    const finalRecommendations = recommendations.slice(0, 3);

    // Update recommendations list
    const list = document.getElementById('recommendationsList');
    list.innerHTML = '';

    if (finalRecommendations.length === 0) {
        // If no specific recommendations, show a general positive message
        const li = document.createElement('li');
        li.className = 'recommendation-item';
        li.innerHTML = `
            <div class="recommendation-content">
                <p class="recommendation-text">Your skin is in good condition! Consider our maintenance programs to keep your skin healthy.</p>
                <div class="recommendation-action">
                    <span class="program-name">All Programs</span>
                    <button class="learn-more-btn" onclick="document.querySelector('#programs').scrollIntoView({behavior: 'smooth'})">
                        Learn More
                    </button>
                </div>
            </div>
        `;
        list.appendChild(li);
    } else {
        finalRecommendations.forEach(rec => {
            const li = document.createElement('li');
            li.className = 'recommendation-item';

            li.innerHTML = `
                <div class="recommendation-content">
                    <p class="recommendation-text">${rec.text}</p>
                    <div class="recommendation-action">
                        <span class="program-name">${rec.program}</span>
                        <button class="learn-more-btn" onclick="document.querySelector('${rec.link}').scrollIntoView({behavior: 'smooth'})">
                            Learn More
                        </button>
                    </div>
                </div>
            `;

            list.appendChild(li);
        });
    }
}

// Show/hide loading overlay
function showLoading(show) {
    // You can add a loading overlay here if needed
    console.log('Loading:', show);
}

// Retake photo
function retakePhoto() {
    analysisSection.style.display = 'none';
    capturedImage = null;
    analyzeBtn.disabled = true;
    captureBtn.disabled = false;
    captureBtn.textContent = '📸 Capture';
}

// Handle errors gracefully
window.addEventListener('error', function (e) {
    console.error('Application error:', e.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function (e) {
    console.error('Unhandled promise rejection:', e.reason);
});

// Program Slider Functionality
// Track current slide position for each slider separately
const sliderPositions = new Map();
const slidesToShow = 3;

function slidePrograms(direction, buttonElement) {
    // Find the slider container relative to the clicked button
    const sliderContainer = buttonElement.closest('.program-slider-container');
    if (!sliderContainer) return;

    const slider = sliderContainer.querySelector('.program-grid-with-images');
    const sliderWrapper = sliderContainer.querySelector('.program-slider');
    if (!slider || !sliderWrapper) return;

    // Get or initialize current slide position for this slider
    const sliderId = sliderContainer.id || sliderContainer.getAttribute('data-slider-id') ||
                     Array.from(document.querySelectorAll('.program-slider-container')).indexOf(sliderContainer).toString();

    if (!sliderPositions.has(sliderId)) {
        sliderPositions.set(sliderId, 0);
    }

    let currentSlide = sliderPositions.get(sliderId);

    // Calculate total slides for this specific slider
    const cards = slider.querySelectorAll('.program-card-with-image');
    const totalSlides = cards.length;

    // Get container width and calculate exact card width
    const containerWidth = sliderWrapper.getBoundingClientRect().width;
    const gap = 40; // 2.5rem = 40px
    // Card width is (containerWidth - 2*gap) / 3 for 3 columns
    const cardWidth = (containerWidth - (2 * gap)) / 3;
    const slideDistance = cardWidth + gap;

    if (direction === 'left') {
        currentSlide = currentSlide - 1;
        if (currentSlide < 0) {
            currentSlide = Math.max(0, totalSlides - slidesToShow);
        }
    } else {
        currentSlide = currentSlide + 1;
        if (currentSlide > totalSlides - slidesToShow) {
            currentSlide = 0;
        }
    }

    // Update stored position
    sliderPositions.set(sliderId, currentSlide);

    const translateX = -currentSlide * slideDistance;
    slider.style.transform = `translateX(${translateX}px)`;
}