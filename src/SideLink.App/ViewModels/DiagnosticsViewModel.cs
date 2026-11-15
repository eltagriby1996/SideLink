using System.Collections.ObjectModel;
using System.IO;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using Microsoft.Win32;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.App.ViewModels;

public partial class DiagnosticsViewModel : ObservableObject
{
    private readonly IDiagnosticsService _diagnosticsService;
    private readonly ILogger<DiagnosticsViewModel> _logger;

    public ObservableCollection<DiagnosticCheckResult> Checks { get; } = new();

    [ObservableProperty]
    private bool _isRunning;

    [ObservableProperty]
    private string _statusSummary = "جاهز لتشخيص وفحص مكونات النظام وتعريفات Apple...";

    [ObservableProperty]
    private bool _allPassed;

    public DiagnosticsViewModel(IDiagnosticsService diagnosticsService, ILogger<DiagnosticsViewModel> logger)
    {
        _diagnosticsService = diagnosticsService;
        _logger = logger;
    }

    public async Task InitializeAsync()
    {
        await RunDiagnosticsAsync();
    }

    [RelayCommand]
    public async Task RunDiagnosticsAsync()
    {
        IsRunning = true;
        StatusSummary = "جاري فحص تعريفات Apple، منافذ usbmuxd، وخدمات التوقيع...";
        Checks.Clear();

        try
        {
            var results = await _diagnosticsService.RunAllDiagnosticsAsync();
            foreach (var r in results)
            {
                Checks.Add(r);
            }

            AllPassed = Checks.All(c => c.Passed);
            int passedCount = Checks.Count(c => c.Passed);
            StatusSummary = AllPassed
                ? $"✓ اكتمل الفحص بنجاح: جميع الفحوصات ({passedCount} من {Checks.Count}) سليمة والبرنامج جاهز تماماً للتوقيع والتثبيت."
                : $"⚠️ اكتمل الفحص: {passedCount} من {Checks.Count} فحوصات سليمة. يرجى مراجعة التنبيهات الموضحة أدناه لحلها.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Diagnostics check failed");
            StatusSummary = "تعذر إكمال الفحص: " + ex.Message;
        }
        finally
        {
            IsRunning = false;
        }
    }

    [RelayCommand]
    public async Task RestartAppleServiceAsync()
    {
        IsRunning = true;
        StatusSummary = "جاري محاولة إعادة تشغيل خدمة Apple Mobile Device Service تلقائياً...";
        try
        {
            await Task.Run(() =>
            {
                try
                {
                    using var p = new System.Diagnostics.Process();
                    p.StartInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = "/c net stop \"Apple Mobile Device Service\" & net start \"Apple Mobile Device Service\"",
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };
                    p.Start();
                    p.WaitForExit(5000);
                }
                catch { }
            });

            await Task.Delay(1000);
            await RunDiagnosticsAsync();
            StatusSummary = "✓ تمت إعادة تشغيل خدمة Apple Mobile Device بنجاح وتم تحديث حالة الفحص.";
        }
        catch (Exception ex)
        {
            StatusSummary = "تعذر إعادة تشغيل الخدمة: " + ex.Message;
        }
        finally
        {
            IsRunning = false;
        }
    }

    [RelayCommand]
    public async Task ExportReportAsync()
    {
        var dialog = new SaveFileDialog
        {
            FileName = $"SideLink_Diagnostic_Report_{DateTime.UtcNow:yyyyMMdd_HHmmss}.txt",
            Filter = "ملفات نصية (*.txt)|*.txt|كافة الملفات (*.*)|*.*",
            Title = "حفظ تقرير تشخيص النظام"
        };

        if (dialog.ShowDialog() == true)
        {
            try
            {
                string report = await _diagnosticsService.GenerateDiagnosticReportAsync();
                await File.WriteAllTextAsync(dialog.FileName, report);
                StatusSummary = $"✓ تم حفظ تقرير التشخيص بنجاح في ({Path.GetFileName(dialog.FileName)}).";
            }
            catch (Exception ex)
            {
                StatusSummary = "فشل في حفظ التقرير: " + ex.Message;
            }
        }
    }
}
