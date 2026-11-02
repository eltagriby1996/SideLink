# SideLink Troubleshooting and Diagnostics Guide

This document provides actionable solutions for common installation, connection, driver, and signing issues.

---

## 1. Device Connection & USB Detection

### Problem: "No Apple devices detected over USB"
- **Cause 1**: The iPhone screen is locked.
  - **Fix**: Unlock your iPhone with your Passcode before connecting the USB cable.
- **Cause 2**: The device is not trusted by the computer.
  - **Fix**: Look at your iPhone screen, tap **Trust This Computer**, and enter your passcode.
- **Cause 3**: Apple Mobile Device Service (AMDS) is not running.
  - **Fix**: Press `Win + R`, type `services.msc`, locate **Apple Mobile Device Service**, right-click and select **Start** (or **Restart**).
- **Cause 4**: Missing Apple drivers.
  - **Fix**: Install the 64-bit non-Microsoft Store version of iTunes from [apple.com/itunes](https://www.apple.com/itunes/) to install official Apple USB drivers.

---

## 2. Link Unlock Verification

### Problem: "Cannot connect to verification server"
- **Cause**: Network unreachable or Vercel backend server is down.
  - **Fix**: Open the **Diagnostics** tab in SideLink to check connectivity to the verification gateway.
  - Ensure your internet connection is active.
  - In local development mode, ensure the Next.js dev server is running (`npm run dev` in `sidelink-web/`).

### Problem: "Session Expired"
- **Cause**: Verification sessions are valid for 10 minutes.
  - **Fix**: In the SideLink verification window, click **Start New Verification Session** or restart the app.

---

## 3. Signing and Provisioning

### Problem: "An IPA file is required to re-sign and refresh"
- **Cause**: SideLink needs the original `.ipa` package to rebuild and re-sign Mach-O binaries when refreshing 7-day certificates.
  - **Fix**: Keep the original `.ipa` file in your downloads or documents folder. If the file was moved, re-add it through the **IPA Library** tab.

### Problem: "Maximum number of apps reached"
- **Cause**: Apple limits free personal development accounts to 3 active sideloaded apps per iOS device.
  - **Fix**: Remove an existing application or upgrade to a paid Apple Developer Program account.
