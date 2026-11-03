using System.Text.Json.Serialization;

namespace Imperatle.Api.Models;

// How well known an empire is, for picking practice rounds. Not part of the
// empire content: tiers come from Content/practice-difficulty.json, with a
// rule by area for empires the file doesn't list (see PracticeDifficultyTiers).
[JsonConverter(typeof(JsonStringEnumConverter<PracticeDifficulty>))]
public enum PracticeDifficulty
{
    Any,
    Easy,
    Medium,
    Hard,
}
