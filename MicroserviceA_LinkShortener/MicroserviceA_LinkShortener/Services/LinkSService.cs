using Grpc.Core;
using System;
using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Threading.Tasks;

namespace MicroserviceA_LinkShortener.Services;

public class LinkSService : LinkShortener.LinkShortenerBase
{
    private static readonly ConcurrentDictionary<string, string> Urls = new();
    private readonly string _baseUrl;

    // O construtor agora recebe a URL base
    public LinkSService()
    {
        _baseUrl = Environment.GetEnvironmentVariable("BASE_URL") ?? "http://localhost:5001";
    }

    public override Task<CreateLinkReply> CreateLink(CreateLinkRequest request, ServerCallContext context)
    {
        var shortCode = GenerateShortURL();
        Urls.TryAdd(shortCode, request.Url);

        // Constrói a URL completa antes de retornar
        var fullShortUrl = $"{_baseUrl}/{shortCode}";

        return Task.FromResult(new CreateLinkReply
        {
            ShortUrl = fullShortUrl // Agora retorna a URL completa
        });
    }

    private static string GenerateShortURL()
    {
        var bytes = new byte[6];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);

        string urlSafeBase64 = Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');

        return urlSafeBase64;
    }

    public string GetOriginalUrl(string shortCode)
    {
        Urls.TryGetValue(shortCode, out var originalUrl);
        return originalUrl ?? string.Empty;
    }
}
