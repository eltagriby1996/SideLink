using System.Collections.ObjectModel;
using System.IO;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using Microsoft.Win32;
using BitLoader.Core.Interfaces;
using BitLoader.Core.Models;

namespace BitLoader.App.ViewModels;

public partial class DiagnosticsViewModel : ObservableObject
{
    private readonly IDiagnosticsService _diagnosticsService;
    private readonly ILogger<DiagnosticsViewModel> _logger;

    public ObservableCollection<DiagnosticCheckResult> Checks { get; } = new();

    [ObservableProperty]
    private bool _isRunning;

    [ObservableProperty]
    private string _statusSummary = "System diagnostics ready.";

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
        StatusSummary = "Running system checks...";
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
            StatusSummary = $"Completed: {passedCount} of {Checks.Count} checks passed.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Diagnostics check failed");
            StatusSummary = "Diagnostics failed: " + ex.Message;
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
            FileName = $"BitLoader_Diagnostic_Report_{DateTime.UtcNow:yyyyMMdd_HHmmss}.txt",
            Filter = "Text Files (*.txt)|*.txt|All Files (*.*)|*.*",
            Title = "Save Diagnostic Report"
        };

        if (dialog.ShowDialog() == true)
        {
            try
            {
                string report = await _diagnosticsService.GenerateDiagnosticReportAsync();
                await File.WriteAllTextAsync(dialog.FileName, report);
                StatusSummary = $"Diagnostic report exported to {Path.GetFileName(dialog.FileName)}.";
            }
            catch (Exception ex)
            {
                StatusSummary = "Failed to export report: " + ex.Message;
            }
        }
    }
}
