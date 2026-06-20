FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

COPY worker/WorkerServiceRaMedia/WorkerServiceRaMedia.csproj worker/WorkerServiceRaMedia/
RUN dotnet restore worker/WorkerServiceRaMedia/WorkerServiceRaMedia.csproj

COPY worker/WorkerServiceRaMedia/ worker/WorkerServiceRaMedia/
RUN dotnet publish worker/WorkerServiceRaMedia/WorkerServiceRaMedia.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "WorkerServiceRaMedia.dll"]
