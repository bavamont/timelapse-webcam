# Timelapse Webcam

A desktop application for creating stunning timelapse videos from your webcam. Built with Electron and powered by FFmpeg for high-quality video processing with automatic capture, FTP/SFTP upload, and advanced video creation features.

## Features

### Webcam Capture
- **Automated Capture** - Take photos at custom intervals (seconds, minutes, or hours)
- **Multi-Camera Support** - Detect and select from available webcams
- **High Resolution** - Support for resolutions up to 4K (3840×2160)
- **Real-Time Preview** - Live camera preview with watermark overlay
- **Smart Status Tracking** - Monitor capture progress with detailed statistics

### Advanced Watermarking
- **Text Watermarks** - Add custom text overlays with position control
- **Image Watermarks** - Use PNG, JPG, or other image formats as watermarks
- **Size Control** - Small, medium, or large watermark sizing options
- **Opacity Settings** - Adjustable transparency from 10% to 100%
- **Position Control** - Place watermarks in any corner or center
- **Real-Time Preview** - See watermark placement before capturing

### Image Processing
- **Multiple Formats** - Save as JPEG, PNG, or WebP with quality control
- **Professional Watermarking** - Text and image overlays with transparency support
- **Automatic Upload** - Real-time FTP upload of captured images
- **Smart Storage** - Organized file structure with automatic cleanup options

### Professional Video Creation
- **High-Quality Output** - Create MP4 videos with customizable FPS (12-60)
- **Quality Presets** - Low, Medium, High, and Ultra quality settings
- **Hardware Acceleration** - GPU-accelerated encoding for faster processing
- **Background Music** - Add audio tracks with volume control
- **Video Effects** - Fade in/out, zoom, and pan effects
- **Batch Processing** - Create videos from any image sequence

### Advanced Features
- **FTP/SFTP Integration** - Automatic upload of both images and videos to remote servers
- **Auto-Timelapse Creation** - Scheduled automatic timelapse creation every 24/48/72 hours
- **Storage Management** - Auto-cleanup with configurable retention periods
- **Multi-Language** - Full support for English and German interfaces
- **Real-Time Progress** - Live progress tracking with frame counting
- **Custom Output** - Flexible naming and export options
- **Single Instance Lock** - Prevents multiple application instances
- **Custom Title Bar** - Modern frameless window with custom controls

## Supported Formats

### Image Input/Output
- **JPEG** (.jpg, .jpeg) - Optimized for photos with adjustable quality
- **PNG** (.png) - Perfect for images with transparency
- **WebP** (.webp) - Modern format with superior compression

### Watermark Images
- **PNG** (.png) - Recommended for transparency support
- **JPEG** (.jpg, .jpeg) - Standard photo format
- **GIF** (.gif) - Animated graphics support
- **BMP** (.bmp) - Bitmap image format
- **WebP** (.webp) - Modern web format
- **SVG** (.svg) - Scalable vector graphics

### Audio Input
- **MP3** (.mp3) - Most common audio format
- **WAV** (.wav) - Uncompressed high-quality audio
- **AAC** (.aac, .m4a) - Advanced audio coding

### Video Output
- **MP4** (.mp4) - Universal compatibility with H.264 encoding

## Quick Start

1. **Setup Camera** - Connect your webcam and select it from the dropdown
2. **Configure Capture** - Choose resolution and set your desired interval
3. **Add Watermark** (Optional) - Select text or image watermark with custom positioning
4. **Set Storage** - Select save location and optionally configure FTP upload
5. **Start Capturing** - Click "Start Capture" to begin taking photos
6. **Create Video** - Use the Timelapse tab to turn your images into stunning videos

## Interface Overview

### Main Tabs
- **Capture** - Camera preview, capture controls, and real-time statistics
- **Timelapse** - Video creation interface with advanced options
- **Settings** - Comprehensive configuration for all app features
- **Help** - Built-in documentation and tips for best results

### Capture Interface
- **Live Preview** - Real-time camera feed with watermark preview
- **Watermark Controls** - Switch between text and image watermarks
- **Capture Stats** - Images captured, elapsed time, next capture time
- **Status Indicator** - Visual status showing stopped, capturing, or paused state
- **Quick Controls** - Start, pause, resume, and stop capture functions

### Watermark Settings
- **Type Selection** - Choose between text or image watermarks
- **Text Settings** - Custom text input with font styling
- **Image Settings** - Browse and select watermark images
- **Size Control** - Small (150px), Medium (200px), Large (300px)
- **Opacity Control** - Adjustable transparency from 10% to 100%
- **Position Options** - Top-left, top-right, bottom-left, bottom-right, center
- **Live Preview** - Real-time preview in camera feed

### Video Creation
- **Image Selection** - Choose from captured images or import custom sequences
- **Output Settings** - Configure name, FPS, quality, and effects
- **Audio Integration** - Add background music with volume control
- **Progress Tracking** - Real-time creation progress with frame counting

## Configuration Options

### Auto-Timelapse Settings
- **Schedule Options** - Create timelapses automatically every 24, 48, 72 hours or weekly
- **File Management** - Choose to replace previous files or create new timestamped versions
- **Auto-Upload** - Automatically upload created timelapses to FTP/SFTP servers
- **Notification** - Get notified when auto-timelapses are created

### Camera Settings
- **Resolution Options** - 640×480 to 4K (3840×2160)
- **Capture Intervals** - 1 second to multiple hours
- **Image Quality** - JPEG quality from 50-100%
- **Auto-Start** - Automatic capture on application launch

### Watermark Configuration
- **Text Watermarks** - Custom text with position control
- **Image Watermarks** - Support for PNG, JPEG, GIF, BMP, WebP, SVG
- **Size Options** - Small, medium, and large preset sizes
- **Transparency** - Opacity control from 10% to 100%
- **Positioning** - Five position presets plus custom placement
- **Preview Mode** - Real-time watermark preview overlay

### FTP/SFTP Settings
- **Protocol Selection** - Choose between FTP or SFTP protocols
- **Server Configuration** - Host, port (auto-detected: 21 for FTP, 22 for SFTP), username, and password
- **Auto-Upload** - Separate settings for images and videos
- **Directory Structure** - Custom remote folder organization
- **Connection Testing** - Built-in FTP/SFTP connection verification

### Storage Management
- **Local Storage** - Configurable storage location
- **Auto-Cleanup** - Automatic deletion of old files (7-90 days)
- **Storage Limits** - Maximum storage quotas (5GB-100GB or unlimited)
- **Folder Structure** - Organized by date and type

### Video Processing
- **Quality Presets** - Low, Medium, High, and Ultra settings optimized for different use cases
- **Hardware Acceleration** - GPU encoding when available for faster processing
- **Aspect Ratio** - Maintain or modify video proportions
- **Custom Effects** - Professional transitions and movements (fade, zoom, pan)
- **Frame Rate Control** - Adjustable FPS from 12 to 60

## Keyboard Shortcuts

- **Space** - Start/Stop capture
- **P** - Pause/Resume capture
- **Ctrl+T** - Create timelapse from current images
- **Ctrl+S** - Open settings
- **F11** - Toggle fullscreen
- **Ctrl+Q** - Quit application
- **Ctrl+Shift+I** - Open developer tools (debug mode)

## Use Cases & Tips

### Time-lapse Subjects
- **Cloud Movement** - 10-30 second intervals for dynamic sky scenes
- **Plant Growth** - 15-60 minute intervals for long-term growth documentation
- **Construction** - 5-15 minute intervals for building progress
- **Traffic Flow** - 1-5 second intervals for busy intersections
- **Sunrise/Sunset** - 30 second intervals for golden hour scenes

### Watermark Best Practices
- **Logo Placement** - Use PNG images with transparency for professional logos
- **Brand Consistency** - Maintain consistent watermark placement across all captures
- **Size Considerations** - Choose watermark size appropriate to image resolution
- **Opacity Balance** - Use 60-80% opacity for subtle but visible watermarks
- **High Contrast** - Ensure watermarks are visible against various backgrounds
- **Format Selection** - PNG recommended for logos, JPEG for photographic watermarks

### Best Practices
- **Stable Setup** - Use a tripod or secure mounting for consistent framing
- **Lighting** - Ensure adequate and consistent lighting throughout capture
- **Storage Planning** - A 24-hour capture at 30-second intervals creates ~2,880 images
- **Power Management** - Use AC power for extended capture sessions
- **Test Runs** - Start with short captures to verify settings and framing
- **Watermark Testing** - Preview watermark placement and opacity before long captures

### Technical Recommendations
- **Internet Connection** - Stable connection required for FTP/SFTP uploads
- **Disk Space** - Plan for 2-5MB per image depending on resolution and quality
- **Processing Power** - Higher-end CPU/GPU for faster video creation
- **Camera Quality** - USB 3.0 cameras recommended for high-resolution capture
- **Watermark Images** - Use high-resolution source images for best quality

## Installation & Updates

### System Requirements
- **Memory** - 4GB RAM minimum, 8GB recommended
- **Storage** - 1GB for application, additional space for captures
- **Camera** - USB webcam with DirectShow (Windows) or V4L2 (Linux) support
- **Network** - Internet connection for FTP/SFTP uploads and updates
- **Graphics** - DirectX 11 compatible for hardware acceleration
- **Node.js** - Version 22.0.0 or higher
- **NPM** - Version 10.0.0 or higher

### Auto-Updates
The application includes automatic update checking and installation. Updates are delivered through GitHub releases with incremental patches and feature additions.

## Update History

**02/08/2025** - 1.0.0 - Complete rewrite with modern UI
- Multi-language support (English/German)
- Video creation with FFmpeg and hardware acceleration
- Text and image watermarking system with live preview
- FTP/SFTP upload
- Automatic scheduled timelapse creation (24/48/72 hours)
- Auto-updater functionality
- Video effects (fade, zoom, pan)

**26/04/2019** - 0.0.1, Initial release


## Troubleshooting

### Common Issues
- **Camera Not Detected** - Check USB connection and camera permissions
- **FTP/SFTP Upload Fails** - Verify server settings, protocol selection, and network connectivity
- **Video Creation Slow** - Enable hardware acceleration in settings
- **Storage Full** - Enable auto-cleanup or increase storage limits
- **Watermark Not Showing** - Check image path and format compatibility
- **Auto-Timelapse Not Working** - Verify schedule settings and ensure app remains running

### Watermark Issues
- **Image Not Loading** - Verify image format is supported (PNG, JPEG, GIF, BMP, WebP, SVG)
- **Poor Quality** - Use high-resolution source images for watermarks
- **Transparency Problems** - Use PNG format for transparent watermarks
- **Size Issues** - Adjust watermark size setting or use different source image
- **Position Problems** - Check camera preview for accurate positioning

### FFmpeg Requirements
This software uses FFmpeg for video processing. The FFmpeg binaries are included with the application for seamless operation across all supported platforms.

## Credits

**Developed by Bavamont** - [www.bavamont.com](https://www.bavamont.com)

**Powered by:**
- **FFmpeg** - Video and audio processing ([LGPLv2.1](http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html))
- **Sharp.js** - High-performance image processing and watermarking
- **Electron** - Cross-platform desktop framework
- **basic-ftp** - FTP client implementation
- **ssh2-sftp-client** - SFTP client implementation