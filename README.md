# Timelapse Webcam

A desktop application for automated timelapse creation from webcam and screen capture sources. Built with Electron and powered by modern video processing technologies for high-quality time-lapse photography and videography.

## Features

### Timelapse Creation
- **Webcam Capture** - Record from any connected USB or built-in camera with live preview
- **Screen Recording** - Capture full desktop screen for screen-based timelapses
- **Interval Control** - Set capture intervals from seconds to hours for custom timelapse speed
- **Motion Detection** - Basic motion-triggered capture with adjustable sensitivity settings
- **Scheduled Capture** - Time-based capture with day-of-week selection and start/stop times
- **Automatic Timelapse Creation** - Periodic automatic video generation from recent captures (24-72 hour intervals)
- **Capture Pause/Resume** - Temporarily pause capture sessions without stopping completely

### Video Processing
- **FFmpeg Integration** - Video encoding with H.264 codec and basic format support
- **Multiple Formats** - Export to MP4, AVI, and MOV formats
- **Quality Control** - Four quality presets (Low, Medium, High, Ultra) with adjustable settings
- **Frame Rate Options** - Adjustable output frame rates from 1 to 120 FPS
- **Resolution Support** - Process videos from 720p to 4K (depending on source capabilities) with aspect ratio preservation
- **Video Effects** - Fade in/out, zoom, and pan effects for enhanced visual appeal

### Export and Sharing
- **Platform Presets** - Pre-configured export settings for YouTube, Instagram, TikTok, and web
- **Watermarking** - Add text or image watermarks with position and opacity control
- **Background Music** - Integrate audio tracks with volume control
- **FTP/SFTP Upload** - Automatic upload to remote servers with connection testing
- **Local Export** - Save videos locally with custom naming and organization

### Project Management
- **Settings Persistence** - Save and restore application settings automatically  
- **Project Files** - Save capture configurations in .tlp project format
- **Storage Management** - Automatic file cleanup with configurable retention periods
- **Quota Control** - Set storage limits with automatic cleanup when exceeded

### User Interface
- **Live Preview** - Real-time camera preview with capture status monitoring
- **Progress Tracking** - Visual progress indicators for video creation and upload
- **Multi-Language** - English and German interface support
- **Cross-Platform** - Consistent experience across Windows, macOS, and Linux

## Supported Formats

### Input Sources
- **Webcam Devices** - USB and built-in cameras with automatic device detection
- **Screen Capture** - Full desktop screen recording
- **Audio Files** (.mp3, .wav, .aac, .ogg) - Background music for video creation
- **Captured Images** (.jpg, .jpeg) - Process captured images for timelapse creation

### Output Formats
- **MP4** (.mp4) - H.264 encoding with adjustable quality settings
- **AVI** (.avi) - Standard video format for broad compatibility  
- **MOV** (.mov) - QuickTime format for video editing workflows
- **Project Files** (.tlp) - Save capture settings and configurations

## Quick Start

### Creating Your First Timelapse
1. **Select Camera** - Choose from available webcam devices or screen capture
2. **Set Interval** - Configure capture frequency (seconds, minutes, or hours)
3. **Start Capture** - Begin recording with live preview monitoring
4. **Create Video** - Use captured images to generate timelapse video
5. **Export or Upload** - Save locally or upload via FTP/SFTP

### Setting Up Automation
1. **Motion Detection** - Enable motion-triggered capture with sensitivity adjustment
2. **Schedule Capture** - Set specific times and days for automatic recording
3. **Storage Management** - Configure automatic cleanup and storage limits
4. **Upload Configuration** - Set up FTP/SFTP for automatic video upload

## Interface Overview

### Navigation Tabs
- **Capture** - Camera selection, capture settings, and live preview
- **Timelapse** - Video creation, export options, and video management
- **Settings** - Application preferences, storage, and upload configuration
- **Help** - Documentation and application information

### Main Workflow
1. **Setup** - Configure camera source and capture parameters
2. **Capture** - Record images at specified intervals with optional motion detection
3. **Create** - Generate timelapse videos from captured image sequences
4. **Export** - Save videos locally or upload to remote servers automatically

## Configuration Options

### Capture Settings
- **Image Quality** - JPEG quality from 1-100% with format selection (JPEG, PNG, WebP)
- **Resolution Control** - Camera resolution from 720p to 4K based on device capabilities
- **Interval Timing** - Capture frequency from 1 second to several hours
- **Auto-start** - Automatically begin capture when application launches

### Motion Detection
- **Advanced Sensitivity** - Threshold settings from 10-100% for motion triggering
- **Noise Filtering** - Intelligent noise reduction to prevent false triggers
- **Motion Zones** - Define specific areas for motion detection with custom sensitivity
- **Cooldown Timer** - Prevent excessive captures with 1-60 second delays
- **Enhanced Algorithm** - Improved pixel difference analysis with zone-based detection

### Scheduling
- **Advanced Time Windows** - Set start and stop times for automated capture
- **Day Selection** - Choose specific days of the week for scheduled recording
- **Cron Pattern Support** - Use advanced cron expressions for complex scheduling
- **Seasonal Rules** - Different schedules for different months/seasons
- **Holiday Exceptions** - Skip capture on specific dates or date ranges
- **Timezone Support** - Local time zone handling for scheduling accuracy

### Storage Management
- **Default Paths** - Images saved to `~/TimelapseWebcam/images/`, Videos to `~/TimelapseWebcam/videos/`
- **Auto Cleanup** - Delete old files after specified number of days (1-365)
- **Storage Limits** - Set maximum storage usage (1-1000 GB) with automatic cleanup
- **File Organization** - Automatic timestamp-based file naming and organization

### Network Upload
- **Protocol Support** - FTP and SFTP with standard authentication
- **Auto Upload** - Automatically upload captured images and created videos
- **Connection Testing** - Verify server connectivity before starting uploads
- **Custom Directories** - Configure remote folder paths for file organization

### Video Export
- **Quality Presets** - Four preset levels (Low, Medium, High, Ultra) with custom bitrate
- **Platform Formats** - Export presets optimized for YouTube, Instagram, TikTok  
- **Audio Integration** - Add background music with volume control (0-100%)
- **Format Selection** - Choose output format and codec for different use cases

## Performance & Optimization

- **FFmpeg Processing** - Leverages FFmpeg for efficient video encoding and processing
- **Hardware Acceleration** - Optional GPU acceleration when supported by system
- **Background Operation** - Capture continues while application runs in background
- **Resource Management** - Efficient memory usage during long capture sessions
- **Queue Processing** - Serialized video creation to prevent system overload

## Technical Details

- **Framework** - Electron (v37+) for cross-platform desktop application
- **Video Processing** - FFmpeg for video encoding and format conversion
- **Image Processing** - Canvas-based capture with Sharp.js for watermarking and processing
- **Languages** - JavaScript (ES6+), HTML5, CSS3
- **Supported OS** - Windows 10/11, macOS 10.15+, Linux (Ubuntu 18.04+)
- **Architecture** - Chromium-based with Node.js backend integration
- **Security** - Context isolation and secure inter-process communication

## System Requirements

### Minimum Requirements
- **OS**: Windows 10, macOS 10.15, or Linux (Ubuntu 18.04+)
- **RAM**: 4GB RAM for basic operation
- **Storage**: 1GB available space for application and temporary files
- **Camera**: USB webcam or built-in camera for video capture
- **FFmpeg**: Required for video processing (automatic detection or manual install)

### Recommended Requirements
- **OS**: Windows 11, macOS 12+, or recent Linux distribution  
- **RAM**: 8GB RAM for smooth 4K processing and large timelapse projects
- **Storage**: 5GB+ available space for image sequences and video output
- **Network**: Broadband connection for FTP/SFTP upload functionality
- **Graphics**: Dedicated GPU recommended for faster video encoding

## Installation

### From Release
1. **Download** - Get the latest release package for your platform
2. **Install** - Run the platform-specific installer
3. **Launch** - Start the application and begin creating timelapses

### From Source
```bash
git clone https://github.com/bavamont/timelapse-webcam.git
cd timelapse-webcam
npm install
npm start
```

### Build Commands
```bash
npm run build          # Build for current platform
npm run build:win      # Build for Windows
npm run build:mac      # Build for macOS  
npm run build:linux    # Build for Linux
npm run dist           # Create distribution packages
```

## Update History

**27/08/2025** - 1.1.0 - Enhanced timelapse functionality and automation
- Motion detection with adjustable sensitivity for triggered capture
- Screen capture support for desktop and application window recording
- Scheduling system with time windows and day-of-week selection
- Export presets for popular video platforms (YouTube, Instagram, TikTok)
- Project save/load system for capture configuration management
- Automatic timelapse creation with configurable intervals (24-72 hours)
- Capture pause/resume functionality for better session control
- Video effects including fade, zoom, and pan transitions
- Enhanced security with context isolation and improved file handling
- Updated to Electron 37.2.4 with performance improvements

**Initial Release** - 1.0.0 - Core timelapse application
- Webcam capture with interval-based image recording
- Basic video creation from image sequences using FFmpeg
- FTP/SFTP upload support for remote storage
- Text and image watermarking with position control
- Automatic timelapse generation at specified intervals
- Cross-platform support with modern Electron-based interface

## Credits

Developed by **www.bavamont.com**

Built with:
- **Electron** - Cross-platform desktop application framework
- **FFmpeg** - Video processing and encoding engine
- **Sharp** - Node.js image processing library
- **basic-ftp** - FTP client for file uploads
- **ssh2-sftp-client** - SFTP client for secure file transfers
- **electron-store** - Application settings persistence
- **node-cron** - Task scheduling for automated capture

---

*For support, feature requests, or bug reports, please check the project's issue tracker or visit the project website.*