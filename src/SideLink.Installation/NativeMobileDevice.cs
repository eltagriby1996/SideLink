using System.Runtime.InteropServices;
using System.Text;
using System.Xml.Linq;
using Microsoft.Extensions.Logging;
using SideLink.Core.Models;

namespace SideLink.Installation;

public static class NativeMobileDevice
{
    private static bool _isInitialized;
    private static readonly object _initLock = new();

    #region P/Invoke Definitions

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr LoadLibrary(string lpFileName);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetDllDirectory(string lpPathName);

    [StructLayout(LayoutKind.Sequential)]
    public struct AMDeviceNotificationCallbackInfo
    {
        public IntPtr dev_ptr;
        public int msg;
    }

    public delegate void AMDeviceNotificationCallback(ref AMDeviceNotificationCallbackInfo info, IntPtr arg);
    public delegate void AMInstallCallback(IntPtr dict, IntPtr arg);

    [DllImport("MobileDevice.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int AMDeviceNotificationSubscribe(AMDeviceNotificationCallback callback, uint unused1, uint unused2, IntPtr unused3, out IntPtr notification);

    [DllImport("MobileDevice.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int AMDeviceNotificationUnsubscribe(IntPtr notification);

    [DllImport("MobileDevice.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int AMDeviceConnect(IntPtr device);

    [DllImport("MobileDevice.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int AMDeviceIsPaired(IntPtr device);

    [DllImport("MobileDevice.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int AMDeviceValidatePairing(IntPtr device);

    [DllImport("MobileDevice.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int AMDeviceStartSession(IntPtr device);

    [DllImport("MobileDevice.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int AMDeviceStopSession(IntPtr device);

    [DllImport("MobileDevice.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int AMDeviceDisconnect(IntPtr device);

    [DllImport("MobileDevice.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr AMDeviceCopyValue(IntPtr device, IntPtr domain, IntPtr cfstringKey);

    [DllImport("MobileDevice.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int AMDeviceSecureTransferPath(int zero, IntPtr device, IntPtr url, IntPtr options, AMInstallCallback callback, IntPtr arg);

    [DllImport("MobileDevice.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int AMDeviceSecureStartService(IntPtr device, IntPtr serviceName, IntPtr zero, out IntPtr serviceConnection);

    [DllImport("MobileDevice.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int AMDServiceConnectionSendMessage(IntPtr conn, IntPtr propertyList, int format);

    [DllImport("MobileDevice.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int AMDServiceConnectionReceiveMessage(IntPtr conn, out IntPtr propertyList, out int format);

    [DllImport("MobileDevice.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern void AMDServiceConnectionInvalidate(IntPtr conn);

    [DllImport("CoreFoundation.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int CFRunLoopRunInMode(IntPtr mode, double seconds, bool returnAfterSourceHandled);

    [DllImport("CoreFoundation.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr CFStringCreateWithCharacters(IntPtr alloc, [MarshalAs(UnmanagedType.LPWStr)] string chars, int numChars);

    [DllImport("CoreFoundation.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr CFURLCreateWithFileSystemPath(IntPtr allocator, IntPtr filePath, int pathStyle, bool isDirectory);

    [DllImport("CoreFoundation.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr CFPropertyListCreateWithData(IntPtr allocator, IntPtr data, int options, out int format, out IntPtr error);

    [DllImport("CoreFoundation.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr CFPropertyListCreateData(IntPtr allocator, IntPtr propertyList, int format, int options, out IntPtr error);

    [DllImport("CoreFoundation.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr CFDataCreate(IntPtr allocator, byte[] bytes, int length);

    [DllImport("CoreFoundation.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int CFDataGetLength(IntPtr data);

    [DllImport("CoreFoundation.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr CFDataGetBytePtr(IntPtr data);

    [DllImport("CoreFoundation.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern void CFRelease(IntPtr obj);

    [DllImport("CoreFoundation.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern bool CFStringGetCString(IntPtr handle, byte[] buffer, int bufferSize, uint encoding);

    #endregion

    public static bool EnsureInitialized(ILogger logger)
    {
        lock (_initLock)
        {
            if (_isInitialized) return true;

            try
            {
                string support = @"C:\Program Files\Common Files\Apple\Apple Application Support";
                string mobile = @"C:\Program Files\Common Files\Apple\Mobile Device Support";

                if (!Directory.Exists(mobile))
                {
                    logger.LogWarning("Apple Mobile Device Support directory not found at {Path}", mobile);
                    return false;
                }

                Environment.SetEnvironmentVariable("PATH", 
                    support + ";" + mobile + ";" + Environment.GetEnvironmentVariable("PATH"));

                SetDllDirectory(support);
                LoadLibrary(Path.Combine(support, "CoreFoundation.dll"));

                SetDllDirectory(mobile);
                IntPtr hMd = LoadLibrary(Path.Combine(mobile, "MobileDevice.dll"));

                _isInitialized = hMd != IntPtr.Zero;
                if (_isInitialized)
                {
                    logger.LogInformation("Successfully loaded Apple MobileDevice native runtime libraries.");
                }
                return _isInitialized;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to initialize Apple MobileDevice native libraries.");
                return false;
            }
        }
    }

    public static async Task<(bool Success, string? ErrorMessage)> InstallIpaAsync(
        string ipaPath,
        string targetUdid,
        IProgress<AppOperationProgress>? progress,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (!EnsureInitialized(logger))
        {
            return (false, "خدمة Apple Mobile Device Support غير متوفرة أو غير مثبتة بشكل صحيح. يرجى التأكد من تثبيت iTunes 64-bit.");
        }

        return await Task.Run<(bool Success, string? ErrorMessage)>(() =>
        {
            IntPtr notifHandle = IntPtr.Zero;
            IntPtr devicePtr = IntPtr.Zero;
            var discoveryLock = new object();

            AMDeviceNotificationCallback notifCb = (ref AMDeviceNotificationCallbackInfo info, IntPtr arg) =>
            {
                if (info.msg == 1 && info.dev_ptr != IntPtr.Zero)
                {
                    lock (discoveryLock)
                    {
                        // Check if this device matches UDID or use first available
                        string udid = GetDeviceUdid(info.dev_ptr);
                        if (string.IsNullOrWhiteSpace(targetUdid) || 
                            string.Equals(udid, targetUdid, StringComparison.OrdinalIgnoreCase) || 
                            devicePtr == IntPtr.Zero)
                        {
                            devicePtr = info.dev_ptr;
                        }
                    }
                }
            };

            try
            {
                int subRet = AMDeviceNotificationSubscribe(notifCb, 0, 0, IntPtr.Zero, out notifHandle);
                if (subRet != 0)
                {
                    return (false, $"فشل الاتصال بخدمة أجهزة Apple (Error code: 0x{subRet:X8}).");
                }

                // Pump runloop for up to 3 seconds to discover device
                IntPtr defaultMode = CreateCFString("kCFRunLoopDefaultMode");
                for (int i = 0; i < 6 && devicePtr == IntPtr.Zero; i++)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    CFRunLoopRunInMode(defaultMode, 0.5, false);
                }
                CFRelease(defaultMode);

                if (devicePtr == IntPtr.Zero)
                {
                    return (false, "تعذر العثور على جهاز آيفون متصل عبر كابل USB. يرجى توصيل الهاتف والتأكد من ظهوره على جهاز الكمبيوتر.");
                }

                // 1. Connect
                int cRet = AMDeviceConnect(devicePtr);
                if (cRet != 0)
                {
                    return (false, $"فشل الاتصال بجهاز الآيفون عبر منفذ USB (Error: 0x{cRet:X8}).");
                }

                // 2. Validate Pairing
                int isPaired = AMDeviceIsPaired(devicePtr);
                int pRet = AMDeviceValidatePairing(devicePtr);
                if (isPaired == 0 || pRet != 0)
                {
                    AMDeviceDisconnect(devicePtr);
                    return (false, "جهاز الآيفون غير مقترن بهذا الكمبيوتر. يرجى فتح قفل شاشة الآيفون والضغط على \"الوثوق بهذا الكمبيوتر\" (Trust This Computer).");
                }

                // 3. Start Session
                int sRet = AMDeviceStartSession(devicePtr);
                if (sRet != 0)
                {
                    AMDeviceDisconnect(devicePtr);
                    return (false, $"فشل بدء جلسة العمل مع نظام الآيفون (Lockdown Session Error: 0x{sRet:X8}). يرجى التأكد من فتح قفل الشاشة.");
                }

                try
                {
                    // 4. Transfer package to iPhone staging
                    var ipaFi = new FileInfo(ipaPath);
                    double sizeMb = ipaFi.Exists ? (ipaFi.Length / (1024.0 * 1024.0)) : 0;
                    string sizeText = sizeMb > 0 ? $" ({sizeMb:F1} ميجابايت)" : "";

                    progress?.Report(new AppOperationProgress
                    {
                        Title = "تثبيت التطبيق على الآيفون",
                        CurrentStep = $"جاري نقل حزمة التطبيق إلى الآيفون عبر منفذ USB{sizeText}... يرجى الانتظار",
                        PercentComplete = 15
                    });

                    // Heartbeat timer to keep progress bar alive and moving during USB transfer
                    using var transferCts = new CancellationTokenSource();
                    int transferPct = 15;
                    var transferTimer = Task.Run(async () =>
                    {
                        while (!transferCts.Token.IsCancellationRequested && transferPct < 44)
                        {
                            try
                            {
                                await Task.Delay(2000, transferCts.Token);
                                transferPct += 3;
                                progress?.Report(new AppOperationProgress
                                {
                                    Title = "تثبيت التطبيق على الآيفون",
                                    CurrentStep = $"جاري نقل حزمة التطبيق إلى مساحة التثبيت على الآيفون{sizeText}... ({transferPct}%)",
                                    PercentComplete = transferPct
                                });
                            }
                            catch { break; }
                        }
                    });

                    IntPtr cfPath = CreateCFString(ipaPath);
                    IntPtr cfUrl = CFURLCreateWithFileSystemPath(IntPtr.Zero, cfPath, 2 /* Windows Path */, false);
                    CFRelease(cfPath);

                    int tRet = AMDeviceSecureTransferPath(0, devicePtr, cfUrl, IntPtr.Zero, null, IntPtr.Zero);
                    CFRelease(cfUrl);
                    transferCts.Cancel();

                    if (tRet != 0)
                    {
                        return (false, $"فشل نقل ملف التطبيق إلى الآيفون (Transfer Error: 0x{tRet:X8}). تحقق من توفر مساحة تخزين كافية على هاتفك.");
                    }

                    progress?.Report(new AppOperationProgress
                    {
                        Title = "تثبيت التطبيق على الآيفون",
                        CurrentStep = "اكتمل نقل الملف! جاري إعادة تهيئة جلسة التثبيت في نظام iOS...",
                        PercentComplete = 45
                    });

                    // Reset session after transfer: Apple MobileDevice requires resetting the lockdown session after AFC file transfer
                    AMDeviceStopSession(devicePtr);
                    AMDeviceDisconnect(devicePtr);

                    int reconnRet = AMDeviceConnect(devicePtr);
                    int reSessionRet = AMDeviceStartSession(devicePtr);
                    if (reconnRet != 0 || reSessionRet != 0)
                    {
                        logger.LogWarning("Session reset warning: connect=0x{C:X8}, session=0x{S:X8}", reconnRet, reSessionRet);
                    }

                    // 5. Start com.apple.mobile.installation_proxy
                    IntPtr serviceName = CreateCFString("com.apple.mobile.installation_proxy");
                    IntPtr serviceConn;
                    int servRet = AMDeviceSecureStartService(devicePtr, serviceName, IntPtr.Zero, out serviceConn);
                    CFRelease(serviceName);

                    if (servRet != 0 || serviceConn == IntPtr.Zero)
                    {
                        return (false, $"فشل تشغيل خدمة التثبيت على الآيفون (StartService Error: 0x{servRet:X8}).");
                    }

                    try
                    {
                        string ipaFileName = Path.GetFileName(ipaPath);
                        string stagePath = $"PublicStaging/{ipaFileName}";

                        string installXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                            "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n" +
                            "<plist version=\"1.0\">\n<dict>\n" +
                            "    <key>Command</key><string>Install</string>\n" +
                            $"    <key>PackagePath</key><string>{stagePath}</string>\n" +
                            "    <key>ClientOptions</key><dict>\n" +
                            "        <key>PackageType</key><string>Developer</string>\n" +
                            "    </dict>\n" +
                            "</dict>\n</plist>";

                        byte[] xmlBytes = Encoding.UTF8.GetBytes(installXml);
                        IntPtr cfData = CFDataCreate(IntPtr.Zero, xmlBytes, xmlBytes.Length);
                        int formatOut;
                        IntPtr errorOut;
                        IntPtr plist = CFPropertyListCreateWithData(IntPtr.Zero, cfData, 0, out formatOut, out errorOut);
                        CFRelease(cfData);

                        int sendRet = AMDServiceConnectionSendMessage(serviceConn, plist, 200 /* Binary Plist */);
                        CFRelease(plist);

                        if (sendRet != 0)
                        {
                            return (false, $"فشل إرسال أمر التثبيت إلى خدمة iOS (Send Error: 0x{sendRet:X8}).");
                        }

                        // Read streaming installation responses from iOS
                        while (!cancellationToken.IsCancellationRequested)
                        {
                            IntPtr respPlist;
                            int respFormat;
                            int recvRet = AMDServiceConnectionReceiveMessage(serviceConn, out respPlist, out respFormat);
                            if (recvRet != 0 || respPlist == IntPtr.Zero)
                            {
                                break;
                            }

                            IntPtr xmlData = CFPropertyListCreateData(IntPtr.Zero, respPlist, 100 /* XML */, 0, out errorOut);
                            CFRelease(respPlist);

                            if (xmlData != IntPtr.Zero)
                            {
                                int len = CFDataGetLength(xmlData);
                                byte[] buf = new byte[len];
                                IntPtr ptr = CFDataGetBytePtr(xmlData);
                                Marshal.Copy(ptr, buf, 0, len);
                                CFRelease(xmlData);

                                string xml = Encoding.UTF8.GetString(buf);
                                logger.LogDebug("iOS installation response: {Xml}", xml);

                                var parsed = ParseInstallationResponse(xml);
                                if (!string.IsNullOrEmpty(parsed.Status))
                                {
                                    int progressPct = MapStatusToProgress(parsed.Status, parsed.PercentComplete);
                                    string stepDesc = MapStatusToDescription(parsed.Status);
                                    progress?.Report(new AppOperationProgress
                                    {
                                        Title = "تثبيت التطبيق على الآيفون",
                                        CurrentStep = stepDesc,
                                        PercentComplete = progressPct
                                    });
                                }

                                if (parsed.HasError)
                                {
                                    string friendlyError = TranslateIosError(parsed.ErrorCode, parsed.ErrorDescription);
                                    return (false, friendlyError);
                                }

                                if (parsed.IsComplete)
                                {
                                    progress?.Report(new AppOperationProgress
                                    {
                                        Title = "تثبيت التطبيق على الآيفون",
                                        CurrentStep = "✓ تم تثبيت التطبيق بنجاح على الآيفون!",
                                        PercentComplete = 100,
                                        IsCompleted = true
                                    });
                                    return (true, null);
                                }
                            }
                        }

                        return (true, null);
                    }
                    finally
                    {
                        AMDServiceConnectionInvalidate(serviceConn);
                    }
                }
                finally
                {
                    AMDeviceStopSession(devicePtr);
                    AMDeviceDisconnect(devicePtr);
                }
            }
            finally
            {
                if (notifHandle != IntPtr.Zero)
                {
                    AMDeviceNotificationUnsubscribe(notifHandle);
                }
            }
        }, cancellationToken);
    }

    public static async Task<bool> UninstallAppAsync(
        string bundleIdentifier,
        string targetUdid,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (!EnsureInitialized(logger)) return false;

        return await Task.Run(() =>
        {
            IntPtr notifHandle = IntPtr.Zero;
            IntPtr devicePtr = IntPtr.Zero;

            AMDeviceNotificationCallback notifCb = (ref AMDeviceNotificationCallbackInfo info, IntPtr arg) =>
            {
                if (info.msg == 1 && info.dev_ptr != IntPtr.Zero)
                {
                    devicePtr = info.dev_ptr;
                }
            };

            try
            {
                AMDeviceNotificationSubscribe(notifCb, 0, 0, IntPtr.Zero, out notifHandle);
                IntPtr defaultMode = CreateCFString("kCFRunLoopDefaultMode");
                for (int i = 0; i < 6 && devicePtr == IntPtr.Zero; i++)
                {
                    CFRunLoopRunInMode(defaultMode, 0.5, false);
                }
                CFRelease(defaultMode);

                if (devicePtr == IntPtr.Zero) return false;

                if (AMDeviceConnect(devicePtr) != 0) return false;
                if (AMDeviceStartSession(devicePtr) != 0)
                {
                    AMDeviceDisconnect(devicePtr);
                    return false;
                }

                try
                {
                    IntPtr serviceName = CreateCFString("com.apple.mobile.installation_proxy");
                    IntPtr serviceConn;
                    int sRet = AMDeviceSecureStartService(devicePtr, serviceName, IntPtr.Zero, out serviceConn);
                    CFRelease(serviceName);

                    if (sRet != 0 || serviceConn == IntPtr.Zero) return false;

                    try
                    {
                        string uninstallXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                            "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n" +
                            "<plist version=\"1.0\">\n<dict>\n" +
                            "    <key>Command</key><string>Uninstall</string>\n" +
                            $"    <key>ApplicationIdentifier</key><string>{bundleIdentifier}</string>\n" +
                            "</dict>\n</plist>";

                        byte[] xmlBytes = Encoding.UTF8.GetBytes(uninstallXml);
                        IntPtr cfData = CFDataCreate(IntPtr.Zero, xmlBytes, xmlBytes.Length);
                        int formatOut;
                        IntPtr errorOut;
                        IntPtr plist = CFPropertyListCreateWithData(IntPtr.Zero, cfData, 0, out formatOut, out errorOut);
                        CFRelease(cfData);

                        AMDServiceConnectionSendMessage(serviceConn, plist, 200);
                        CFRelease(plist);

                        // Read response
                        IntPtr respPlist;
                        int respFormat;
                        AMDServiceConnectionReceiveMessage(serviceConn, out respPlist, out respFormat);
                        if (respPlist != IntPtr.Zero) CFRelease(respPlist);
                        return true;
                    }
                    finally
                    {
                        AMDServiceConnectionInvalidate(serviceConn);
                    }
                }
                finally
                {
                    AMDeviceStopSession(devicePtr);
                    AMDeviceDisconnect(devicePtr);
                }
            }
            finally
            {
                if (notifHandle != IntPtr.Zero)
                {
                    AMDeviceNotificationUnsubscribe(notifHandle);
                }
            }
        }, cancellationToken);
    }

    private static string GetDeviceUdid(IntPtr dev)
    {
        try
        {
            IntPtr key = CreateCFString("UniqueDeviceID");
            IntPtr val = AMDeviceCopyValue(dev, IntPtr.Zero, key);
            CFRelease(key);

            if (val != IntPtr.Zero)
            {
                byte[] buf = new byte[128];
                if (CFStringGetCString(val, buf, buf.Length, 0x08000100 /* UTF8 */))
                {
                    int len = 0;
                    while (len < buf.Length && buf[len] != 0) len++;
                    CFRelease(val);
                    return Encoding.UTF8.GetString(buf, 0, len);
                }
                CFRelease(val);
            }
        }
        catch { }
        return string.Empty;
    }

    private static IntPtr CreateCFString(string str)
    {
        return CFStringCreateWithCharacters(IntPtr.Zero, str, str.Length);
    }

    private static (string? Status, int PercentComplete, bool HasError, string? ErrorCode, string? ErrorDescription, bool IsComplete) ParseInstallationResponse(string xml)
    {
        try
        {
            var doc = XDocument.Parse(xml);
            var rootDict = doc.Root?.Element("dict");
            if (rootDict == null) return (null, 0, false, null, null, false);

            string? status = null;
            int percent = 0;
            string? error = null;
            string? desc = null;

            var elements = rootDict.Elements().ToList();
            for (int i = 0; i < elements.Count - 1; i += 2)
            {
                if (elements[i].Name.LocalName == "key")
                {
                    string key = elements[i].Value;
                    var valElem = elements[i + 1];

                    if (key.Equals("Status", StringComparison.OrdinalIgnoreCase))
                    {
                        status = valElem.Value;
                    }
                    else if (key.Equals("PercentComplete", StringComparison.OrdinalIgnoreCase))
                    {
                        int.TryParse(valElem.Value, out percent);
                    }
                    else if (key.Equals("Error", StringComparison.OrdinalIgnoreCase))
                    {
                        error = valElem.Value;
                    }
                    else if (key.Equals("ErrorDescription", StringComparison.OrdinalIgnoreCase))
                    {
                        desc = valElem.Value;
                    }
                }
            }

            bool isComplete = string.Equals(status, "Complete", StringComparison.OrdinalIgnoreCase);
            bool hasError = !string.IsNullOrEmpty(error);

            return (status, percent, hasError, error, desc, isComplete);
        }
        catch
        {
            return (null, 0, false, null, null, false);
        }
    }

    private static int MapStatusToProgress(string status, int iosPercent)
    {
        if (iosPercent > 0)
        {
            // Map iOS 0-100% to UI 45-100%
            return 45 + (int)(iosPercent * 0.55);
        }

        return status switch
        {
            "TakingInstallLock" => 50,
            "CreatingStagingDirectory" => 55,
            "ExtractingPackage" => 65,
            "InspectingPackage" => 75,
            "PreflightingApplication" => 80,
            "VerifyingApplication" => 85,
            "InstallingEmbeddedProfile" => 90,
            "InstallingApplication" => 95,
            "Complete" => 100,
            _ => 50
        };
    }

    private static string MapStatusToDescription(string status)
    {
        return status switch
        {
            "TakingInstallLock" => "حجز مسار التثبيت في نظام iOS...",
            "CreatingStagingDirectory" => "إنشاء حاوية التطبيق المؤقتة...",
            "ExtractingPackage" => "فك ضغط حزمة التطبيق على الآيفون...",
            "InspectingPackage" => "فحص ملفات وبيانات التطبيق...",
            "PreflightingApplication" => "التحقق الأولي من متطلبات التثبيت...",
            "VerifyingApplication" => "التحقق من التوقيع الرقمي والشهادة (Code Signature)...",
            "InstallingEmbeddedProfile" => "تثبيت ملف التعريف (Mobileprovision)...",
            "InstallingApplication" => "تثبيت التطبيق على الشاشة الرئيسية...",
            "Complete" => "اكتمل التثبيت بنجاح!",
            _ => $"جاري التثبيت في iOS ({status})..."
        };
    }

    private static string TranslateIosError(string? errorCode, string? description)
    {
        if (string.Equals(errorCode, "ApplicationVerificationFailed", StringComparison.OrdinalIgnoreCase))
        {
            string msg = "❌ فشل التثبيت من نظام iOS: [ApplicationVerificationFailed]\n" +
                   "رفض نظام iOS التوقيع الرقمي للتطبيق. يجب توقيع التطبيق بحساب Apple ID أو شهادة مطور صالحة (P12) تحتوي على معرّف هذا الجهاز (UDID)، أو تثبيت AppSync Unified إذا كان الجهاز به جيلبريك.";
            if (!string.IsNullOrWhiteSpace(description))
            {
                msg += $"\n\nتفاصيل الخطأ من نظام iOS:\n{description}";
            }
            return msg;
        }

        if (string.Equals(errorCode, "UpgradeDoNotAllowToDowngrade", StringComparison.OrdinalIgnoreCase))
        {
            return "❌ فشل التثبيت: توجد نسخة أحدث من هذا التطبيق مثبتة بالفعل على هاتفك. لا يسمح iOS بالرجوع إلى إصدار أقدم إلا بعد حذف النسخة الحالية أولاً.";
        }

        if (string.Equals(errorCode, "MissingApplicationIdentifier", StringComparison.OrdinalIgnoreCase))
        {
            return "❌ فشل التثبيت: الحزمة ينقصها معرّف التطبيق (CFBundleIdentifier) داخل ملف Info.plist.";
        }

        if (string.Equals(errorCode, "DeviceNotSupportedByThinning", StringComparison.OrdinalIgnoreCase))
        {
            return "❌ فشل التثبيت: هذه الحزمة مخصصة لطراز جهاز آخر (Device Thinning). يرجى استخدام ملف IPA متوافق مع جهازك.";
        }

        if (string.Equals(errorCode, "APIInternalError", StringComparison.OrdinalIgnoreCase))
        {
            if (description != null && (description.Contains("IXErrorDomain Code=46") || (description.Contains("already exists") && description.Contains("App Store"))))
            {
                return "⚠️ فشل التثبيت: تطبيق Spotify (أو نسخته الرسمية) مثبت بالفعل حالياً على جهاز الآيفون من متجر App Store!\n\n" +
                       "📌 سبب الخطأ: نظام iOS يمنع استبدال تطبيق رسمي من متجر App Store بتطبيق خارجي (Sideloaded) يحمل نفس المعرّف (com.spotify.client).\n\n" +
                       "💡 الحل: يرجى إلغاء تثبيت (حذف) تطبيق Spotify الموجود حالياً على شاشة الآيفون، ثم الضغط مجدداً على 'Sign & Install Application'.";
            }

            return $"❌ خطأ من نظام iOS [APIInternalError]:\n{description ?? "حدث خطأ غير متوقع أثناء تثبيت الحزمة."}";
        }

        return $"❌ فشل التثبيت من نظام iOS: [{errorCode}]\n{description ?? "يرجى التحقق من صحة ملف الـ IPA وتوقيعه."}";
    }
}
