using System.Text.Json.Serialization;

namespace Imperatle.Api.Models;

[JsonConverter(typeof(JsonStringEnumConverter<FeedbackCategory>))]
public enum FeedbackCategory
{
    Bug,
    Idea,
    Content,
    Other,
}
