using System.Collections.Concurrent;
using System.Text.Json;
using NetTopologySuite.Geometries;
using NetTopologySuite.Geometries.Utilities;
using NetTopologySuite.Operation.Overlay;
using NetTopologySuite.Operation.OverlayNG;

namespace Imperatle.Api.Game;

// Where the map's empire sits from a guessed one, from their two shapes:
// - Shared: how much the territories overlap, as the shared part over both
//   together (intersection over union), so 1 only when they're the same;
// - DistanceKm: between the borders, when they don't overlap at all;
// - BearingDegrees: compass direction (0 = north) from the middle of the
//   guess to the middle of the answer;
// - AnswerCovered / GuessCovered: how much of each one lies inside the other
//   (1 = all of it), so "the answer is inside your guess" can be told apart
//   from a small overlap, though both give a small Shared.
public record Proximity(double Shared, int? DistanceKm, double BearingDegrees, double AnswerCovered = 0, double GuessCovered = 0);

public static class EmpireGeometry
{
    private const double EarthRadiusKm = 6371.0088;

    // Points compared per shape for the border-to-border distance: plenty for
    // a distance shown rounded, and quick for every pair.
    private const int BorderSamples = 600;

    private static readonly GeometryFactory Factory = new();

    // Shapes only change with the content (a deploy, or the dev editor), so
    // the key carries the length too: an edited shape is parsed again.
    private static readonly ConcurrentDictionary<(string Slug, int Length), Parsed?> ParsedShapes = new();
    private static readonly ConcurrentDictionary<(string, int, string, int), Proximity?> Pairs = new();

    private sealed record Parsed(Geometry Geometry, double AreaKm2, (double Lon, double Lat)[] Border, (double Lon, double Lat) Centre);

    // Null when either empire has no shape (or one that can't be read).
    public static Proximity? Compare(string guessSlug, string? guessShape, string answerSlug, string? answerShape)
    {
        if (guessShape is null || answerShape is null)
        {
            return null;
        }

        return Pairs.GetOrAdd((guessSlug, guessShape.Length, answerSlug, answerShape.Length), _ =>
        {
            var guess = Parse(guessSlug, guessShape);
            var answer = Parse(answerSlug, answerShape);
            return guess is null || answer is null ? null : Compare(guess, answer);
        });
    }

    private static Proximity Compare(Parsed guess, Parsed answer)
    {
        var both = SharedAreaKm2(guess.Geometry, answer.Geometry);
        var union = guess.AreaKm2 + answer.AreaKm2 - both;
        var shared = union > 0 ? Math.Clamp(both / union, 0, 1) : 0;
        int? distance = shared > 0 ? null : (int)Math.Round(BorderDistanceKm(guess.Border, answer.Border));
        return new Proximity(
            shared,
            distance,
            Bearing(guess.Centre, answer.Centre),
            answer.AreaKm2 > 0 ? Math.Clamp(both / answer.AreaKm2, 0, 1) : 0,
            guess.AreaKm2 > 0 ? Math.Clamp(both / guess.AreaKm2, 0, 1) : 0);
    }

    // Shapes may cross the date line with longitudes past ±180, so the guess
    // is also tried a full turn to each side.
    private static double SharedAreaKm2(Geometry guess, Geometry answer)
    {
        var total = 0.0;
        foreach (var shift in new[] { 0.0, 360.0, -360.0 })
        {
            var moved = shift == 0 ? guess : Shift(guess, shift);
            if (!moved.EnvelopeInternal.Intersects(answer.EnvelopeInternal))
            {
                continue;
            }

            var inside = OverlayNGRobust.Overlay(moved, answer, SpatialFunction.Intersection);
            total += SphericalAreaKm2(inside);
        }

        return total;
    }

    private static Geometry Shift(Geometry geometry, double degrees)
    {
        var copy = geometry.Copy();
        copy.Apply(new ShiftFilter(degrees));
        copy.GeometryChanged();
        return copy;
    }

    private sealed class ShiftFilter(double degrees) : ICoordinateSequenceFilter
    {
        public bool Done => false;
        public bool GeometryChanged => true;

        public void Filter(CoordinateSequence seq, int i) => seq.SetX(i, seq.GetX(i) + degrees);
    }

    private static Parsed? Parse(string slug, string json) =>
        ParsedShapes.GetOrAdd((slug, json.Length), _ =>
        {
            try
            {
                var geometry = GeometryFixer.Fix(ReadMultiPolygon(json));
                if (geometry.IsEmpty)
                {
                    return null;
                }

                return new Parsed(geometry, SphericalAreaKm2(geometry), BorderPoints(geometry), Centre(geometry));
            }
            catch (Exception e) when (e is JsonException or ArgumentException or InvalidOperationException or KeyNotFoundException)
            {
                return null;
            }
        });

    // GeoJSON MultiPolygon: polygons → rings → [lon, lat] points.
    private static MultiPolygon ReadMultiPolygon(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var polygons = doc.RootElement.GetProperty("coordinates").EnumerateArray().Select(polygon =>
        {
            var rings = polygon.EnumerateArray().Select(ring => Factory.CreateLinearRing(ring.EnumerateArray()
                .Select(p => new Coordinate(p[0].GetDouble(), p[1].GetDouble()))
                .ToArray()))
                .ToArray();
            return Factory.CreatePolygon(rings[0], rings[1..]);
        });
        return Factory.CreateMultiPolygon([.. polygons]);
    }

    private static IEnumerable<Polygon> Polygons(Geometry geometry)
    {
        for (var i = 0; i < geometry.NumGeometries; i++)
        {
            if (geometry.GetGeometryN(i) is Polygon polygon)
            {
                yield return polygon;
            }
        }
    }

    // Area on the sphere (the same approximation turf.js uses): the planar
    // area in degrees would weigh land near the poles far too much.
    private static double SphericalAreaKm2(Geometry geometry) =>
        Polygons(geometry).Sum(p => Math.Abs(RingArea(p.ExteriorRing.Coordinates)) - p.InteriorRings.Sum(r => Math.Abs(RingArea(r.Coordinates))));

    private static double RingArea(Coordinate[] ring)
    {
        var n = ring.Length;
        if (n < 3)
        {
            return 0;
        }

        var total = 0.0;
        for (var i = 0; i < n; i++)
        {
            var lower = ring[i];
            var middle = ring[(i + 1) % n];
            var upper = ring[(i + 2) % n];
            total += (Radians(upper.X) - Radians(lower.X)) * Math.Sin(Radians(middle.Y));
        }

        return total * EarthRadiusKm * EarthRadiusKm / 2;
    }

    private static (double, double)[] BorderPoints(Geometry geometry)
    {
        var all = Polygons(geometry).SelectMany(p => p.ExteriorRing.Coordinates).ToArray();
        var step = Math.Max(1, all.Length / BorderSamples);
        return all.Where((_, i) => i % step == 0).Select(c => (Radians(c.X), Radians(c.Y))).ToArray();
    }

    // Shortest great-circle distance between the two sampled borders.
    private static double BorderDistanceKm((double Lon, double Lat)[] a, (double Lon, double Lat)[] b)
    {
        var min = double.MaxValue;
        foreach (var p in a)
        {
            var cosP = Math.Cos(p.Lat);
            foreach (var q in b)
            {
                var sinLat = Math.Sin((q.Lat - p.Lat) / 2);
                var sinLon = Math.Sin((q.Lon - p.Lon) / 2);
                var h = sinLat * sinLat + cosP * Math.Cos(q.Lat) * sinLon * sinLon;
                if (h < min)
                {
                    min = h;
                }
            }
        }

        return 2 * EarthRadiusKm * Math.Asin(Math.Sqrt(Math.Min(1, min)));
    }

    // The middle of the territory: each piece's centre, weighted by its area,
    // averaged on the sphere (so pieces on both sides of the date line or of
    // an ocean average out where they should).
    private static (double Lon, double Lat) Centre(Geometry geometry)
    {
        double x = 0, y = 0, z = 0;
        foreach (var polygon in Polygons(geometry))
        {
            var c = polygon.Centroid.Coordinate;
            var weight = SphericalAreaKm2(polygon);
            var lon = Radians(c.X);
            var lat = Radians(c.Y);
            x += weight * Math.Cos(lat) * Math.Cos(lon);
            y += weight * Math.Cos(lat) * Math.Sin(lon);
            z += weight * Math.Sin(lat);
        }

        return (Math.Atan2(y, x), Math.Atan2(z, Math.Sqrt(x * x + y * y)));
    }

    // Initial compass bearing from one point (radians) to another, in degrees.
    private static double Bearing((double Lon, double Lat) from, (double Lon, double Lat) to)
    {
        var dLon = to.Lon - from.Lon;
        var y = Math.Sin(dLon) * Math.Cos(to.Lat);
        var x = Math.Cos(from.Lat) * Math.Sin(to.Lat) - Math.Sin(from.Lat) * Math.Cos(to.Lat) * Math.Cos(dLon);
        var degrees = Math.Atan2(y, x) * 180 / Math.PI;
        return Math.Round((degrees + 360) % 360, 1);
    }

    private static double Radians(double degrees) => degrees * Math.PI / 180;
}
