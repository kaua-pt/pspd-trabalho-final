using MicroserviceB_QRCode.Services;
using Microsoft.OpenApi.Models;
using System.Net; // Para usar IPAddress.Any
using Prometheus;

var builder = WebApplication.CreateBuilder(args);

// ===================================================================
// 1. CONFIGURAÇÃO DO KESTREL (VERSÃO CORRIGIDA)
// ===================================================================
builder.WebHost.ConfigureKestrel(options =>
{
    // Porta 8080 para tráfego gRPC (HTTP/2)
    options.Listen(IPAddress.Any, 8080, listenOptions =>
    {
        listenOptions.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http2;
    });

    // Porta 8081 para tráfego HTTP/1.1 (health checks, swagger, métricas Prometheus)
    options.Listen(IPAddress.Any, 8081, listenOptions =>
    {
        listenOptions.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http1;
    });
});

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

builder.Services.AddGrpcSwagger();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Microservice B - QR Code Generator gRPC API",
        Version = "v1",
        Description = "gRPC service for QR code generation and decoding with JSON transcoding support. " +
                      "This service uses Protocol Buffers (Protobuf) for efficient communication and supports both gRPC and HTTP/REST calls.",
        Contact = new OpenApiContact
        {
            Name = "PSPD Lab - gRPC vs REST Comparison",
            Url = new Uri("https://github.com/pspd-lab")
        }
    });
});

var app = builder.Build();

// Enable routing FIRST
app.UseRouting();
app.UseHttpMetrics();

// Enable CORS AFTER routing
app.UseCors("AllowFrontend");

// Enable Swagger for all environments (including Docker/Production)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "QR Code Generator gRPC API v1");
    c.RoutePrefix = "swagger"; // Access at /swagger
    c.DocumentTitle = "Microservice B - QR Code Generator gRPC API";
});

// Map gRPC service with CORS enabled
app.MapGrpcService<QrcodeService>().RequireCors("AllowFrontend");

// Root endpoint with useful information
app.MapGet("/", () => Results.Json(new
{
    service = "Microservice B - QR Code Generator",
    protocol = "gRPC with JSON Transcoding",
    version = "v1",
    swagger = "/swagger",
    endpoints = new
    {
        createQR = "POST /v1/qrcode/encode",
        decodeQR = "POST /v1/qrcode/decode"
    },
    documentation = "https://go.microsoft.com/fwlink/?linkid=2086909"
}));

// Health check endpoint with CORS
app.MapGet("/health", () => Results.Json(new
{
    status = "healthy",
    service = "qrcode-generator-grpc",
    timestamp = DateTime.UtcNow
}));

app.MapMetrics();

app.Run();
