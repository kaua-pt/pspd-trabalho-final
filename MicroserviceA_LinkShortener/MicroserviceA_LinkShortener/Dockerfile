# Acesse https://aka.ms/customizecontainer para saber como personalizar seu contêiner de depuração e como o Visual Studio usa este Dockerfile para criar suas imagens para uma depuração mais rápida.

# Use AMD64/x86_64 platform to avoid ARM64 protoc issues on Apple Silicon
FROM --platform=linux/amd64 mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081


# Esta fase é usada para compilar o projeto de serviço
FROM --platform=linux/amd64 mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["MicroserviceA_LinkShortener/MicroserviceA_LinkShortener.csproj", "MicroserviceA_LinkShortener/"]
RUN dotnet restore "./MicroserviceA_LinkShortener/MicroserviceA_LinkShortener.csproj"
COPY . .
WORKDIR "/src/MicroserviceA_LinkShortener"
RUN dotnet build "./MicroserviceA_LinkShortener.csproj" -c $BUILD_CONFIGURATION -o /app/build

# Esta fase é usada para publicar o projeto de serviço a ser copiado para a fase final
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./MicroserviceA_LinkShortener.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Esta fase é usada na produção ou quando executada no VS no modo normal (padrão quando não está usando a configuração de Depuração)
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MicroserviceA_LinkShortener.dll"]