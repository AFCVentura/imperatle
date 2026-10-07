# Build stage: restore and publish with the full SDK.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# The .csproj alone first, so the restore layer is reused while packages don't change.
COPY Imperatle.Api.csproj .
RUN dotnet restore Imperatle.Api.csproj

COPY . .
RUN dotnet publish Imperatle.Api.csproj -c Release --no-restore -o /app

# Runtime stage: ASP.NET runtime only, no SDK.
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .

# Azure Container Apps terminates TLS and forwards plain HTTP. Trusting the
# X-Forwarded-* headers gives the app the real scheme (no HTTPS redirect loop,
# secure cookies) and the visitor's IP (per-IP rate limits).
ENV ASPNETCORE_FORWARDEDHEADERS_ENABLED=true

# Non-root user that ships with the image; .NET listens on 8080 by default.
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Imperatle.Api.dll"]
