namespace Imperatle.Api.Dtos;

public record MeUser(Guid Id, string DisplayName, string Email, bool IsSupporter);

public record MeResponse(bool Authenticated, MeUser? User);
