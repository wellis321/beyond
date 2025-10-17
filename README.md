# 🌿 SkinCare Analyzer

An AI-powered skincare analysis application that uses computer vision to analyze skin quality and provide personalized recommendations.

## Features

- 📷 **Real-time Camera Access** - Uses WebRTC to access device camera
- 🎯 **Face Detection** - Powered by MediaPipe for accurate face detection
- 🔍 **Skin Analysis** - Uses OpenCV.js for advanced image processing
- 📊 **Quality Metrics** - Analyzes smoothness, evenness, and clarity
- 💡 **Smart Recommendations** - Provides personalized skincare advice
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Computer Vision**:
  - [MediaPipe](https://mediapipe.dev/) for face detection
  - [OpenCV.js](https://docs.opencv.org/4.8.0/opencv.js) for image processing
- **Camera API**: WebRTC getUserMedia
- **Styling**: Modern CSS with gradients and animations

## How It Works

1. **Camera Access**: The app requests camera permission and displays live video feed
2. **Face Detection**: MediaPipe continuously detects faces in the video stream
3. **Image Capture**: When a face is detected with high confidence, user can capture a photo
4. **Skin Analysis**: OpenCV.js processes the image using multiple algorithms:
   - **Smoothness**: Texture analysis using Gaussian blur difference
   - **Evenness**: Color distribution analysis in Lab color space
   - **Clarity**: Blemish detection using HSV color space
5. **Results Display**: Shows scores and generates personalized recommendations

## Installation & Usage

### Prerequisites
- Modern web browser with camera support
- HTTPS connection (required for camera access in production)

### Running the App

1. **Clone or download the project files**

2. **Install dependencies** (optional - uses CDN by default):
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

5. **Allow camera access** when prompted

6. **Follow the on-screen instructions** to analyze your skin

## Usage Instructions

1. Click "📷 Start Camera" to begin
2. Position your face within the guide circle
3. Wait for the green detection box to appear
4. Click "📸 Capture" when ready
5. Click "🔍 Analyze Skin" to process the image
6. Review your results and recommendations
7. Use "🔄 Retake Photo" to try again or "💾 Save Results" to save

## Analysis Metrics

### Overall Quality Score (0-100)
- **80-100**: Excellent skin quality
- **60-79**: Good skin condition
- **40-59**: Fair, room for improvement
- **0-39**: Needs attention

### Individual Metrics

- **Smoothness**: Analyzes skin texture and roughness
- **Evenness**: Measures skin tone uniformity
- **Clarity**: Detects blemishes and dark spots

## Browser Compatibility

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

## Privacy & Security

- All image processing happens locally in your browser
- No images are sent to external servers
- Camera access is only used for analysis
- Results can be saved locally (demo mode logs to console)

## Limitations

- Analysis is for educational/demonstration purposes
- Results should not replace professional dermatological advice
- Requires good lighting for accurate analysis
- Works best with clear, front-facing photos

## Contributing

This is a demonstration project using open source technologies. Feel free to:
- Fork and modify for your needs
- Add new analysis algorithms
- Improve the UI/UX
- Add new features

## License

MIT License - Feel free to use and modify as needed.

## Acknowledgments

- [MediaPipe](https://mediapipe.dev/) for face detection
- [OpenCV.js](https://docs.opencv.org/4.8.0/opencv.js) for computer vision
- WebRTC for camera access
- Modern CSS techniques for beautiful UI
