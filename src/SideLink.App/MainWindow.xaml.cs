using System.Windows;
using System.Windows.Input;
using SideLink.App.ViewModels;

namespace SideLink.App;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }

    private void MinimizeButton_Click(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Minimized;
    }

    private void MaximizeButton_Click(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }

    private void ApplePasswordInput_PasswordChanged(object sender, RoutedEventArgs e)
    {
        if (DataContext is MainViewModel vm && sender is System.Windows.Controls.PasswordBox pb)
        {
            vm.SigningRefresh.Password = pb.Password;
        }
    }

    private void IpaDropzone_Drop(object sender, DragEventArgs e)
    {
        if (e.Data.GetDataPresent(DataFormats.FileDrop))
        {
            string[] files = (string[])e.Data.GetData(DataFormats.FileDrop);
            if (files != null && files.Length > 0)
            {
                string first = files[0];
                if (first.EndsWith(".ipa", StringComparison.OrdinalIgnoreCase))
                {
                    if (DataContext is MainViewModel vm)
                    {
                        _ = vm.IpaLibrary.LoadIpaFileAsync(first);
                    }
                }
            }
        }
    }
}
