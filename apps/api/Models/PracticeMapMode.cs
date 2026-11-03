using System.Text.Json.Serialization;

namespace Imperatle.Api.Models;

// How the map behaves in a practice round. Progressive = like the daily game
// (outline, then continents, then countries as wrong guesses pile up).
[JsonConverter(typeof(JsonStringEnumConverter<PracticeMapMode>))]
public enum PracticeMapMode
{
    Progressive,
    // Continents and countries from the first attempt.
    Full,
    // Only the empire's outline until the round ends.
    Outline,
}
