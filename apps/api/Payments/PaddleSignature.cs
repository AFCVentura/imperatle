using System.Security.Cryptography;
using System.Text;

namespace Imperatle.Api.Payments;

// Paddle Billing webhook signatures: header "Paddle-Signature: ts=...;h1=...",
// where h1 is the hex HMAC-SHA256 of "{ts}:{raw body}" keyed with the
// destination's secret. More than one h1 can appear while a secret rotates.
public static class PaddleSignature
{
    public const string HeaderName = "Paddle-Signature";

    public enum Result { Valid, Missing, Malformed, Stale, Mismatch }

    public static Result Verify(string? header, ReadOnlySpan<byte> rawBody, string secret, DateTimeOffset now, TimeSpan tolerance)
    {
        if (string.IsNullOrWhiteSpace(header) || string.IsNullOrEmpty(secret))
        {
            return Result.Missing;
        }

        long? ts = null;
        var signatures = new List<byte[]>();
        foreach (var part in header.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var eq = part.IndexOf('=');
            if (eq <= 0) return Result.Malformed;
            var key = part[..eq];
            var value = part[(eq + 1)..];

            if (key == "ts")
            {
                if (!long.TryParse(value, out var parsed)) return Result.Malformed;
                ts = parsed;
            }
            else if (key == "h1")
            {
                try
                {
                    signatures.Add(Convert.FromHexString(value));
                }
                catch (FormatException)
                {
                    return Result.Malformed;
                }
            }
        }

        if (ts is null || signatures.Count == 0)
        {
            return Result.Malformed;
        }

        var age = now - DateTimeOffset.FromUnixTimeSeconds(ts.Value);
        if (age > tolerance || age < -tolerance)
        {
            return Result.Stale;
        }

        var expected = Compute(ts.Value, rawBody, secret);
        foreach (var signature in signatures)
        {
            if (CryptographicOperations.FixedTimeEquals(expected, signature))
            {
                return Result.Valid;
            }
        }
        return Result.Mismatch;
    }

    public static byte[] Compute(long ts, ReadOnlySpan<byte> rawBody, string secret)
    {
        var prefix = Encoding.UTF8.GetBytes($"{ts}:");
        var payload = new byte[prefix.Length + rawBody.Length];
        prefix.CopyTo(payload, 0);
        rawBody.CopyTo(payload.AsSpan(prefix.Length));
        return HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), payload);
    }

    // Builds a header the way Paddle does; used by the tests.
    public static string BuildHeader(long ts, ReadOnlySpan<byte> rawBody, string secret) =>
        $"ts={ts};h1={Convert.ToHexStringLower(Compute(ts, rawBody, secret))}";
}
