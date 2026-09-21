using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.DinkFlix.Controllers;

/// <summary>
/// DINKFLIX server-side integration endpoints.
/// </summary>
[ApiController]
[Authorize]
[Route("DinkFlix")]
public sealed class DinkFlixController : ControllerBase
{
    /// <summary>
    /// Gets TMDB watch-provider availability for a movie or series.
    /// </summary>
    /// <param name="tmdbId">TMDB movie or series identifier.</param>
    /// <param name="type">Either movie or tv.</param>
    /// <param name="region">Two-letter TMDB watch-provider region.</param>
    /// <returns>Available streaming, rental and purchase providers.</returns>
    [HttpGet("TMDB/WatchProviders/{tmdbId:int}")]
    public async Task<ActionResult<object>> GetWatchProviders(
        int tmdbId,
        [FromQuery] string type = "movie",
        [FromQuery] string? region = null)
    {
        if (tmdbId <= 0 || Plugin.Instance is null)
        {
            return NoContent();
        }

        var config = Plugin.Instance.Configuration;
        if (string.IsNullOrWhiteSpace(config.TmdbReadAccessToken))
        {
            return NoContent();
        }

        var mediaType = string.Equals(type, "tv", StringComparison.OrdinalIgnoreCase) ? "tv" : "movie";
        var watchRegion = string.IsNullOrWhiteSpace(region) ? config.TmdbWatchRegion : region;
        if (watchRegion.Length != 2)
        {
            watchRegion = "AU";
        }

        var endpoint = $"https://api.themoviedb.org/3/{mediaType}/{tmdbId}/watch/providers";

        using var client = new HttpClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", config.TmdbReadAccessToken.Trim());
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        try
        {
            using var response = await client.GetAsync(endpoint, HttpContext.RequestAborted).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
            {
                return NoContent();
            }

            await using var stream = await response.Content.ReadAsStreamAsync(HttpContext.RequestAborted).ConfigureAwait(false);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: HttpContext.RequestAborted).ConfigureAwait(false);

            if (!document.RootElement.TryGetProperty("results", out var results)
                || !results.TryGetProperty(watchRegion.ToUpperInvariant(), out var regionData))
            {
                return Ok(new { region = watchRegion.ToUpperInvariant(), streaming = Array.Empty<string>(), rental = Array.Empty<string>(), purchase = Array.Empty<string>(), free = Array.Empty<string>(), attribution = "Availability data by JustWatch via TMDB." });
            }

            static string[] ProviderNames(JsonElement source, string propertyName)
            {
                if (!source.TryGetProperty(propertyName, out var providers) || providers.ValueKind != JsonValueKind.Array)
                {
                    return Array.Empty<string>();
                }

                return providers.EnumerateArray()
                    .Select(item => item.TryGetProperty("provider_name", out var name) ? name.GetString() : null)
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
                    .ToArray()!;
            }

            return Ok(new
            {
                region = watchRegion.ToUpperInvariant(),
                streaming = ProviderNames(regionData, "flatrate"),
                rental = ProviderNames(regionData, "rent"),
                purchase = ProviderNames(regionData, "buy"),
                free = ProviderNames(regionData, "free"),
                attribution = "Availability data by JustWatch via TMDB."
            });
        }
        catch (OperationCanceledException)
        {
            return NoContent();
        }
        catch
        {
            return NoContent();
        }
    }
}
