using System.Security.Cryptography;
using System.Text;

namespace Imperatle.Api.Payments;

// Stripe webhook signatures: header "Stripe-Signature: t=...,v1=...", where v1
// is the hex HMAC-SHA256 of "{t}.{raw body}" keyed with the endpoint's signing
// secret. More than one v1 can appear while a secret rotates; v0 (test only,
// old scheme) is ignored.
public static class StripeSignature
{
    public const string HeaderName = "Stripe-Signature";

    public enum Result { Valid, Missing, Malformed, Stale, Mismatch }

    public static Result Verify(string? header, ReadOnlySpan<byte> rawBody, string secret, DateTimeOffset now, TimeSpan tolerance)
    {
        if (string.IsNullOrWhiteSpace(header) || string.IsNullOrEmpty(secret))
        {
            return Result.Missing;
        }

        long? t = null;
        var signatures = new List<byte[]>();
        foreach (var part in header.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var eq = part.IndexOf('=');
            if (eq <= 0) return Result.Malformed;
            var key = part[..eq];
            var value = part[(eq + 1)..];

            if (key == "t")
            {
                if (!long.TryParse(value, out var parsed)) return Result.Malformed;
                t = parsed;
            }
            else if (key == "v1")
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

        if (t is null || signatures.Count == 0)
        {
            return Result.Malformed;
        }

        var age = now - DateTimeOffset.FromUnixTimeSeconds(t.Value);
        if (age > tolerance || age < -tolerance)
        {
            return Result.Stale;
        }

        var expected = Compute(t.Value, rawBody, secret);
        foreach (var signature in signatures)
        {
            if (CryptographicOperations.FixedTimeEquals(expected, signature))
            {
                return Result.Valid;
            }
        }
        return Result.Mismatch;
    }

    public static byte[] Compute(long t, ReadOnlySpan<byte> rawBody, string secret)
    {
        var prefix = Encoding.UTF8.GetBytes($"{t}.");
        var payload = new byte[prefix.Length + rawBody.Length];
        prefix.CopyTo(payload, 0);
        rawBody.CopyTo(payload.AsSpan(prefix.Length));
        return HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), payload);
    }

    // Builds a header the way Stripe does; used by the tests.
    public static string BuildHeader(long t, ReadOnlySpan<byte> rawBody, string secret) =>
        $"t={t},v1={Convert.ToHexStringLower(Compute(t, rawBody, secret))}";
}
