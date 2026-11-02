using System.Text;
using System.Xml.Linq;

namespace SideLink.IPA;

public static class PlistParser
{
    public static Dictionary<string, object> Parse(byte[] plistData)
    {
        if (plistData == null || plistData.Length == 0)
            return new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

        // Check for Binary Plist magic "bplist00"
        if (plistData.Length >= 8 && Encoding.ASCII.GetString(plistData, 0, 8) == "bplist00")
        {
            return ParseBinaryPlist(plistData);
        }

        // Otherwise parse as XML Plist
        return ParseXmlPlist(plistData);
    }

    public static Dictionary<string, object> ParseXmlPlist(byte[] data)
    {
        var result = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
        try
        {
            using var ms = new MemoryStream(data);
            var doc = XDocument.Load(ms);
            var root = doc.Root?.Element("dict");
            if (root != null)
            {
                var parsed = ParseXmlDict(root);
                if (parsed is Dictionary<string, object> dict)
                    return dict;
            }
        }
        catch
        {
            // Fallback for partial/malformed XML
        }
        return result;
    }

    private static object ParseXmlDict(XElement dictElement)
    {
        var dict = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
        var elements = dictElement.Elements().ToList();
        for (int i = 0; i < elements.Count - 1; i += 2)
        {
            if (elements[i].Name.LocalName == "key")
            {
                var key = elements[i].Value;
                var valElem = elements[i + 1];
                dict[key] = ParseXmlValue(valElem);
            }
        }
        return dict;
    }

    private static object ParseXmlValue(XElement elem)
    {
        switch (elem.Name.LocalName.ToLowerInvariant())
        {
            case "string":
                return elem.Value;
            case "integer":
                return long.TryParse(elem.Value, out var l) ? l : 0L;
            case "real":
                return double.TryParse(elem.Value, out var d) ? d : 0.0;
            case "true":
                return true;
            case "false":
                return false;
            case "date":
                return DateTimeOffset.TryParse(elem.Value, out var dt) ? dt : DateTimeOffset.UtcNow;
            case "data":
                try { return Convert.FromBase64String(elem.Value.Trim()); }
                catch { return Array.Empty<byte>(); }
            case "dict":
                return ParseXmlDict(elem);
            case "array":
                var list = new List<object>();
                foreach (var child in elem.Elements())
                {
                    list.Add(ParseXmlValue(child));
                }
                return list;
            default:
                return elem.Value;
        }
    }

    public static Dictionary<string, object> ParseBinaryPlist(byte[] data)
    {
        // Binary plist parser implementation
        var reader = new BinaryPlistReader(data);
        var root = reader.ReadRoot();
        if (root is Dictionary<string, object> dict)
        {
            return dict;
        }
        return new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
    }
}

internal class BinaryPlistReader
{
    private readonly byte[] _data;
    private byte _offsetIntSize;
    private byte _objectRefSize;
    private ulong _numObjects;
    private ulong _topObject;
    private ulong _offsetTableOffset;
    private readonly List<ulong> _offsetTable = new();

    public BinaryPlistReader(byte[] data)
    {
        _data = data;
        ReadTrailer();
    }

    private void ReadTrailer()
    {
        // Trailer is the last 32 bytes of the file
        if (_data.Length < 32)
            throw new InvalidDataException("Invalid bplist: data too short for trailer");

        int trailerStart = _data.Length - 32;
        _offsetIntSize = _data[trailerStart + 6];
        _objectRefSize = _data[trailerStart + 7];
        _numObjects = ReadUInt64(trailerStart + 8);
        _topObject = ReadUInt64(trailerStart + 16);
        _offsetTableOffset = ReadUInt64(trailerStart + 24);

        // Read offset table
        _offsetTable.Clear();
        for (ulong i = 0; i < _numObjects; i++)
        {
            int offsetPos = (int)(_offsetTableOffset + (i * _offsetIntSize));
            if (offsetPos + _offsetIntSize > _data.Length)
                break;

            ulong objOffset = ReadSizedInt(offsetPos, _offsetIntSize);
            _offsetTable.Add(objOffset);
        }
    }

    public object ReadRoot()
    {
        if (_topObject >= (ulong)_offsetTable.Count)
            return new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

        return ReadObjectAtOffset(_offsetTable[(int)_topObject]);
    }

    private object ReadObjectAtOffset(ulong offset)
    {
        if (offset >= (ulong)_data.Length)
            return string.Empty;

        int pos = (int)offset;
        byte marker = _data[pos];
        byte highNibble = (byte)((marker & 0xF0) >> 4);
        byte lowNibble = (byte)(marker & 0x0F);

        pos++;

        switch (highNibble)
        {
            case 0x0: // Simple
                if (lowNibble == 0x00) return null!;
                if (lowNibble == 0x08) return false;
                if (lowNibble == 0x09) return true;
                return string.Empty;

            case 0x1: // Integer
                int intBytes = 1 << lowNibble;
                return (long)ReadSizedInt(pos, intBytes);

            case 0x2: // Real
                int realBytes = 1 << lowNibble;
                return ReadReal(pos, realBytes);

            case 0x3: // Date
                // Apple epoch begins 2001-01-01 00:00:00 UTC
                double secondsSince2001 = ReadDoubleBigEndian(pos);
                return new DateTimeOffset(2001, 1, 1, 0, 0, 0, TimeSpan.Zero).AddSeconds(secondsSince2001);

            case 0x4: // Data
                int dataLen = ReadCount(ref pos, lowNibble);
                byte[] buffer = new byte[dataLen];
                Buffer.BlockCopy(_data, pos, buffer, 0, Math.Min(dataLen, _data.Length - pos));
                return buffer;

            case 0x5: // ASCII String
                int asciiLen = ReadCount(ref pos, lowNibble);
                int actualAsciiLen = Math.Min(asciiLen, _data.Length - pos);
                return Encoding.ASCII.GetString(_data, pos, actualAsciiLen);

            case 0x6: // Unicode String (UTF-16BE)
                int uniChars = ReadCount(ref pos, lowNibble);
                int uniBytes = uniChars * 2;
                int actualUniBytes = Math.Min(uniBytes, _data.Length - pos);
                return Encoding.BigEndianUnicode.GetString(_data, pos, actualUniBytes);

            case 0xA: // Array
                int arrayCount = ReadCount(ref pos, lowNibble);
                var arrayList = new List<object>();
                for (int i = 0; i < arrayCount; i++)
                {
                    int refPos = pos + (i * _objectRefSize);
                    ulong objRef = ReadSizedInt(refPos, _objectRefSize);
                    if (objRef < (ulong)_offsetTable.Count)
                    {
                        arrayList.Add(ReadObjectAtOffset(_offsetTable[(int)objRef]));
                    }
                }
                return arrayList;

            case 0xD: // Dictionary
                int dictCount = ReadCount(ref pos, lowNibble);
                var dict = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
                int keyRefsStart = pos;
                int valRefsStart = pos + (dictCount * _objectRefSize);

                for (int i = 0; i < dictCount; i++)
                {
                    ulong keyRef = ReadSizedInt(keyRefsStart + (i * _objectRefSize), _objectRefSize);
                    ulong valRef = ReadSizedInt(valRefsStart + (i * _objectRefSize), _objectRefSize);

                    if (keyRef < (ulong)_offsetTable.Count && valRef < (ulong)_offsetTable.Count)
                    {
                        var keyObj = ReadObjectAtOffset(_offsetTable[(int)keyRef]);
                        var valObj = ReadObjectAtOffset(_offsetTable[(int)valRef]);
                        string keyStr = keyObj?.ToString() ?? $"Key_{i}";
                        dict[keyStr] = valObj;
                    }
                }
                return dict;

            default:
                return string.Empty;
        }
    }

    private int ReadCount(ref int pos, byte lowNibble)
    {
        if (lowNibble != 0x0F)
        {
            return lowNibble;
        }
        // Extended count
        byte countMarker = _data[pos++];
        int countBytes = 1 << (countMarker & 0x0F);
        int count = (int)ReadSizedInt(pos, countBytes);
        pos += countBytes;
        return count;
    }

    private ulong ReadSizedInt(int pos, int byteCount)
    {
        ulong val = 0;
        for (int i = 0; i < byteCount && (pos + i) < _data.Length; i++)
        {
            val = (val << 8) | _data[pos + i];
        }
        return val;
    }

    private ulong ReadUInt64(int pos)
    {
        return ReadSizedInt(pos, 8);
    }

    private double ReadReal(int pos, int byteCount)
    {
        if (byteCount == 4)
        {
            byte[] bytes = new byte[4];
            Buffer.BlockCopy(_data, pos, bytes, 0, 4);
            if (BitConverter.IsLittleEndian) Array.Reverse(bytes);
            return BitConverter.ToSingle(bytes, 0);
        }
        return ReadDoubleBigEndian(pos);
    }

    private double ReadDoubleBigEndian(int pos)
    {
        byte[] bytes = new byte[8];
        Buffer.BlockCopy(_data, pos, bytes, 0, 8);
        if (BitConverter.IsLittleEndian) Array.Reverse(bytes);
        return BitConverter.ToDouble(bytes, 0);
    }
}
