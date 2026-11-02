using System.IO.Compression;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using SideLink.IPA;
using Xunit;

namespace SideLink.Tests;

public class PlistAndIpaTests
{
    [Fact]
    public void PlistParser_ParsesXmlPlist_ExtractsCorrectValues()
    {
        string xml = @"<?xml version=""1.0"" encoding=""UTF-8""?>
<!DOCTYPE plist PUBLIC ""-//Apple//DTD PLIST 1.0//EN"" ""http://www.apple.com/DTDs/PropertyList-1.0.dtd"">
<plist version=""1.0"">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.example.testapp</string>
    <key>CFBundleName</key>
    <string>TestApp</string>
    <key>CFBundleShortVersionString</key>
    <string>1.2.3</string>
    <key>CFBundleVersion</key>
    <string>42</string>
    <key>MinimumOSVersion</key>
    <string>16.0</string>
</dict>
</plist>";

        byte[] bytes = Encoding.UTF8.GetBytes(xml);
        var parsed = PlistParser.Parse(bytes);

        parsed.Should().ContainKey("CFBundleIdentifier");
        parsed["CFBundleIdentifier"].Should().Be("com.example.testapp");
        parsed["CFBundleName"].Should().Be("TestApp");
        parsed["CFBundleShortVersionString"].Should().Be("1.2.3");
        parsed["CFBundleVersion"].Should().Be("42");
        parsed["MinimumOSVersion"].Should().Be("16.0");
    }

    [Fact]
    public void MobileProvisionParser_ExtractsExpirationAndTeam()
    {
        var expiration = DateTimeOffset.UtcNow.AddDays(7);
        string plistContent = $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<!DOCTYPE plist PUBLIC ""-//Apple//DTD PLIST 1.0//EN"" ""http://www.apple.com/DTDs/PropertyList-1.0.dtd"">
<plist version=""1.0"">
<dict>
    <key>Name</key>
    <string>iOS Team Provisioning Profile: com.example.testapp</string>
    <key>TeamName</key>
    <string>John Doe (Personal Team)</string>
    <key>TeamIdentifier</key>
    <array>
        <string>ABC123XYZ</string>
    </array>
    <key>ExpirationDate</key>
    <date>{expiration:yyyy-MM-ddTHH:mm:ssZ}</date>
</dict>
</plist>";

        byte[] rawBytes = Encoding.UTF8.GetBytes(plistContent);
        var profile = MobileProvisionParser.Parse(rawBytes);

        profile.Should().NotBeNull();
        profile!.Name.Should().Be("iOS Team Provisioning Profile: com.example.testapp");
        profile.TeamName.Should().Be("John Doe (Personal Team)");
        profile.TeamIdentifier.Should().Be("ABC123XYZ");
        profile.IsExpired.Should().BeFalse();
        profile.DaysRemaining.Should().BeInRange(6.5, 7.5);
    }

    [Fact]
    public async Task IpaInspector_RejectsPathTraversalArchive_ZipSlipSecurityGuard()
    {
        string tempIpa = Path.Combine(Path.GetTempPath(), $"malformed_{Guid.NewGuid():N}.ipa");
        try
        {
            using (var zip = ZipFile.Open(tempIpa, ZipArchiveMode.Create))
            {
                // Create an entry attempting directory traversal
                var evilEntry = zip.CreateEntry("../evil.txt");
                using var writer = new StreamWriter(evilEntry.Open());
                writer.WriteLine("malicious payload");
            }

            var inspector = new IpaInspectorService(NullLogger<IpaInspectorService>.Instance);
            bool isValid = await inspector.ValidateIpaArchiveAsync(tempIpa);

            isValid.Should().BeFalse("Archives containing path traversal (Zip Slip) sequences must be rejected");
        }
        finally
        {
            if (File.Exists(tempIpa)) File.Delete(tempIpa);
        }
    }

    [Fact]
    public async Task IpaInspector_ValidatesAndInspectsCompliantIpaArchive()
    {
        string tempIpa = Path.Combine(Path.GetTempPath(), $"valid_{Guid.NewGuid():N}.ipa");
        try
        {
            using (var zip = ZipFile.Open(tempIpa, ZipArchiveMode.Create))
            {
                var entry = zip.CreateEntry("Payload/TestApp.app/Info.plist");
                using var stream = entry.Open();
                string xml = @"<?xml version=""1.0"" encoding=""UTF-8""?>
<plist version=""1.0"">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.SideLink.sample</string>
    <key>CFBundleName</key>
    <string>SampleApp</string>
    <key>CFBundleShortVersionString</key>
    <string>2.0.1</string>
</dict>
</plist>";
                byte[] bytes = Encoding.UTF8.GetBytes(xml);
                stream.Write(bytes, 0, bytes.Length);
            }

            var inspector = new IpaInspectorService(NullLogger<IpaInspectorService>.Instance);
            bool isValid = await inspector.ValidateIpaArchiveAsync(tempIpa);
            isValid.Should().BeTrue();

            var metadata = await inspector.InspectIpaAsync(tempIpa);
            metadata.BundleIdentifier.Should().Be("com.SideLink.sample");
            metadata.BundleName.Should().Be("SampleApp");
            metadata.Version.Should().Be("2.0.1");
        }
        finally
        {
            if (File.Exists(tempIpa)) File.Delete(tempIpa);
        }
    }
}
