// Global variables
let video, canvas, ctx, faceDetection;
let isAnalyzing = false;
let capturedImage = null;
let opencvReady = false;

// DOM elements
const startCameraBtn = document.getElementById('startCamera');
const analyzeBtn = document.getElementById('analyze');
const captureBtn = document.getElementById('capture');
const retakeBtn = document.getElementById('retake');
const saveResultsBtn = document.getElementById('saveResults');
const analysisSection = document.getElementById('analysisSection');
const loadingOverlay = document.getElementById('loading');

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    video = document.getElementById('video');
    canvas = document.getElementById('output');
    ctx = canvas.getContext('2d');

    // Set canvas size to match video
    canvas.width = 400;
    canvas.height = 300;

    // Initialize MediaPipe Face Detection
    initializeFaceDetection();

    // Check OpenCV.js loading
    checkOpenCVReady();

    // Event listeners
    setupEventListeners();
});

// Initialize MediaPipe Face Detection
function initializeFaceDetection() {
    console.log('Face detection disabled due to MediaPipe WASM memory issues');
    // MediaPipe is causing memory access errors, so we'll disable it completely
    // and enable the capture button directly
    faceDetection = null;
    captureBtn.disabled = false;
    captureBtn.classList.add('pulse');
    console.log('Capture button enabled in fallback mode');
}

// Handle face detection results
function onFaceDetectionResults(results) {
    try {
        // Clear canvas first
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Check if results exist and have detections
        if (!results) {
            console.log('No results from face detection');
            captureBtn.disabled = true;
            captureBtn.classList.remove('pulse');
            return;
        }

        // Debug: Log the entire results structure
        console.log('Face detection results:', results);

        // Check different possible result structures
        let detections = null;
        if (results.detections) {
            detections = results.detections;
        } else if (results.faceDetections) {
            detections = results.faceDetections;
        } else if (Array.isArray(results)) {
            detections = results;
        } else if (results.landmarks) {
            // Sometimes MediaPipe returns landmarks directly
            detections = results.landmarks;
        }

        if (!detections || detections.length === 0) {
            console.log('No faces detected');
            captureBtn.disabled = true;
            captureBtn.classList.remove('pulse');
            return;
        }

        // Get the first detection
        const detection = detections[0];

        // Debug: Log the detection structure
        console.log('Detection structure:', detection);

        // Handle different detection formats
        let score = 0;
        let bbox = null;

        // Try to extract score
        if (detection.score !== undefined) {
            score = detection.score;
        } else if (detection.confidence !== undefined) {
            score = detection.confidence;
        } else if (detection.probability !== undefined) {
            score = detection.probability;
        }

        // Try to extract bounding box
        if (detection.locationData && detection.locationData.relativeBoundingBox) {
            bbox = detection.locationData.relativeBoundingBox;
        } else if (detection.boundingBox) {
            bbox = detection.boundingBox;
        } else if (detection.location && detection.location.relativeBoundingBox) {
            bbox = detection.location.relativeBoundingBox;
        } else if (detection.bbox) {
            bbox = detection.bbox;
        }

        // Show face detection status
        ctx.fillStyle = '#00ff00';
        ctx.font = '16px Arial';
        ctx.fillText(`Face Detected: ${(score * 100).toFixed(1)}%`, 10, 30);

        // Draw bounding box if available
        if (bbox) {
            let x, y, width, height;

            if (bbox.xCenter !== undefined && bbox.yCenter !== undefined) {
                // MediaPipe format: center-based coordinates
                x = bbox.xCenter * canvas.width - (bbox.width * canvas.width) / 2;
                y = bbox.yCenter * canvas.height - (bbox.height * canvas.height) / 2;
                width = bbox.width * canvas.width;
                height = bbox.height * canvas.height;
            } else if (bbox.x !== undefined && bbox.y !== undefined) {
                // Standard format: top-left coordinates
                x = bbox.x * canvas.width;
                y = bbox.y * canvas.height;
                width = bbox.width * canvas.width;
                height = bbox.height * canvas.height;
            } else {
                // Fallback: draw a generic indicator
                ctx.fillStyle = '#00ff00';
                ctx.font = '14px Arial';
                ctx.fillText(`Face: ${(score * 100).toFixed(1)}%`, 10, 50);
            }

            if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
                // Draw bounding box
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);

                // Draw confidence score
                ctx.fillStyle = '#00ff00';
                ctx.font = '14px Arial';
                ctx.fillText(`Face: ${(score * 100).toFixed(1)}%`, x, y - 5);
            }
        }

        // Enable capture button when face is detected with good confidence
        if (score > 0.7) {
            captureBtn.disabled = false;
            captureBtn.classList.add('pulse');
        } else {
            captureBtn.disabled = true;
            captureBtn.classList.remove('pulse');
        }

    } catch (error) {
        console.error('Error in face detection:', error);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        captureBtn.disabled = true;
        captureBtn.classList.remove('pulse');
    }
}

// Check if OpenCV.js is ready
function checkOpenCVReady() {
    if (typeof cv !== 'undefined') {
        opencvReady = true;
        console.log('OpenCV.js is ready');
    } else {
        setTimeout(checkOpenCVReady, 100);
    }
}

// Setup event listeners
function setupEventListeners() {
    startCameraBtn.addEventListener('click', startCamera);
    captureBtn.addEventListener('click', captureImage);
    analyzeBtn.addEventListener('click', analyzeSkin);
    retakeBtn.addEventListener('click', retakePhoto);
    saveResultsBtn.addEventListener('click', saveResults);
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

        // Start face detection
        startFaceDetection();

    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Unable to access camera. Please check permissions.');
    }
}

// Start face detection loop
function startFaceDetection() {
    function detectFaces() {
        try {
            if (video.readyState === video.HAVE_ENOUGH_DATA && faceDetection) {
                faceDetection.send({ image: video });
            } else if (!faceDetection) {
                // Face detection is disabled, enable capture button
                captureBtn.disabled = false;
                captureBtn.classList.add('pulse');
            }
        } catch (error) {
            console.error('Error in face detection loop:', error);
            // If face detection fails repeatedly, disable it
            if (error.message && error.message.includes('memory access out of bounds')) {
                console.log('Disabling face detection due to memory errors');
                faceDetection = null;
                captureBtn.disabled = false;
                captureBtn.classList.add('pulse');
            }
        }
        requestAnimationFrame(detectFaces);
    }
    detectFaces();
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
        // Wait for OpenCV to be ready
        while (!opencvReady) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Perform skin analysis
        const results = await performSkinAnalysis(capturedImage);

        // Display results
        displayResults(results);

    } catch (error) {
        console.error('Analysis error:', error);
        alert('Analysis failed. Please try again.');
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

    // Generate recommendations
    generateRecommendations(results);
}

// Generate personalized recommendations
function generateRecommendations(results) {
    const recommendations = [];

    if (results.smoothness < 70) {
        recommendations.push('Consider using a gentle exfoliating cleanser 2-3 times per week');
        recommendations.push('Try facial massage techniques - visit BEYOND for professional guidance');
    }

    if (results.evenness < 70) {
        recommendations.push('Try using vitamin C serum to improve skin tone');
        recommendations.push('Consider face yoga sessions to improve circulation');
    }

    if (results.clarity < 70) {
        recommendations.push('Consider using salicylic acid for blemish control');
        recommendations.push('Explore BEYOND\'s holistic approach to skin clarity');
    }

    if (results.overall < 60) {
        recommendations.push('Establish a consistent daily skincare routine');
        recommendations.push('Drink plenty of water and maintain a healthy diet');
        recommendations.push('Book a consultation with BEYOND for personalized guidance');
    }

    if (results.overall >= 80) {
        recommendations.push('Great job! Keep up your current skincare routine');
        recommendations.push('Continue protecting your skin from sun damage with SPF');
        recommendations.push('Explore advanced BEYOND techniques to maintain your results');
    }

    // Update recommendations list
    const list = document.getElementById('recommendationsList');
    list.innerHTML = '';
    recommendations.forEach(rec => {
        const li = document.createElement('li');

        // Check if recommendation mentions BEYOND
        if (rec.includes('BEYOND')) {
            li.innerHTML = `${rec} <a href="beyond-index.html" class="beyond-link">Learn More →</a>`;
        } else {
            li.textContent = rec;
        }

        list.appendChild(li);
    });
}

// Show/hide loading overlay
function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Retake photo
function retakePhoto() {
    analysisSection.style.display = 'none';
    capturedImage = null;
    analyzeBtn.disabled = true;
    captureBtn.disabled = false;
    captureBtn.textContent = '📸 Capture';
    captureBtn.classList.remove('pulse');
}

// Save results (placeholder)
function saveResults() {
    const results = {
        overall: document.getElementById('overallScore').textContent,
        smoothness: document.getElementById('smoothnessScore').textContent,
        evenness: document.getElementById('evennessScore').textContent,
        clarity: document.getElementById('clarityScore').textContent,
        timestamp: new Date().toISOString()
    };

    // In a real app, you would save to a database or local storage
    console.log('Saving results:', results);
    alert('Results saved! (This is a demo - results are logged to console)');
}

// Handle errors gracefully
window.addEventListener('error', function (e) {
    console.error('Application error:', e.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function (e) {
    console.error('Unhandled promise rejection:', e.reason);
});
