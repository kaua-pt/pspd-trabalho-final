using MicroserviceA_LinkShortener.Services;
using Microsoft.OpenApi.Models;
using System.Net; // <<< ADICIONADO para usar IPAddress.Any

var builder = WebApplication.CreateBuilder(args);

// ===================================================================
// 1. CONFIGURAÇÃO DO KESTREL (VERSÃO CORRIGIDA)
// ===================================================================
builder.WebHost.ConfigureKestrel(options =>
{
    // Porta 8080 para tráfego HTTP/1.1 (navegador, health checks, swagger)
    options.Listen(IPAddress.Any, 8080, listenOptions =>
    {
        listenOptions.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http1;
    });

    // Porta 8082 para tráfego gRPC (comunicação interna do gateway)
    options.Listen(IPAddress.Any, 8082, listenOptions =>
    {
        listenOptions.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http2;
    });
});

// ===================================================================
// 2. REGISTO DE SERVIÇOS (O SEU CÓDIGO ORIGINAL)
// ===================================================================

// Add CORS policy for frontend access
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader()
              .WithExposedHeaders("Grpc-Status", "Grpc-Message", "Grpc-Encoding", "Grpc-Accept-Encoding");
    });
});

builder.Services.AddGrpc();
builder.Services.AddSingleton<LinkSService>();

builder.Services.AddGrpcSwagger();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Microservice A - Link Shortener gRPC API",
        Version = "v1",
        Description = "gRPC service for URL shortening. This service now uses a hybrid port configuration.",
        Contact = new OpenApiContact
        {
            Name = "PSPD Lab - gRPC vs REST Comparison",
            Url = new Uri("https://github.com/pspd-lab")
        }
    });
});

var app = builder.Build();

// ===================================================================
// 3. CONFIGURAÇÃO DO PIPELINE DE MIDDLEWARE (O SEU CÓDIGO ORIGINAL)
// ===================================================================

app.UseRouting();
app.UseCors("AllowFrontend");
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Link Shortener gRPC API v1");
    c.RoutePrefix = "swagger";
    c.DocumentTitle = "Microservice A - Link Shortener gRPC API";
});

app.MapGrpcService<LinkSService>().RequireCors("AllowFrontend");

app.MapGet("/{shortCode}", (string shortCode, LinkSService service) =>
{
    var originalUrl = service.GetOriginalUrl(shortCode);
    if (string.IsNullOrEmpty(originalUrl))
    {
        return Results.NotFound("Short URL not found.");
    }
    return Results.Redirect(originalUrl, permanent: true);
});

app.MapGet("/", () => Results.Json(new
{
    service = "Microservice A - Link Shortener",
    protocol = "gRPC (HTTP/2 on port 8082) and HTTP/1.1 (on port 8080)",
    version = "v1",
    swagger = "/swagger"
}));

app.MapGet("/health", () => Results.Json(new
{
    status = "healthy",
    service = "link-shortener-grpc",
    timestamp = DateTime.UtcNow
}));

app.Run();