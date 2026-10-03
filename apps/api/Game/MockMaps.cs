namespace Imperatle.Api.Game;

// Temporary map lookup until map assets are modeled in the database. Only the
// Mongol Empire has a map so far; every other empire returns null and the UI
// keeps its placeholder.
public static class MockMaps
{
    private static readonly Dictionary<string, string> MapUrlsBySlug = new()
    {
        ["mongol-empire"] = "/maps/mongol-empire.svg",
    };

    public static string? ForSlug(string slug) => MapUrlsBySlug.GetValueOrDefault(slug);
}
