using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.DinkFlix;

/// <summary>
/// Registers the DINKFLIX index transformation with File Transformation.
/// </summary>
public sealed class FileTransformationRegistrationService : IHostedService
{
    private static readonly Guid TransformationId = Guid.Parse("7e6bf7fd-1b0d-4e7f-a580-83c2c50e9f9d");
    private readonly ILogger<FileTransformationRegistrationService> _logger;

    public FileTransformationRegistrationService(ILogger<FileTransformationRegistrationService> logger)
    {
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await RegisterWithRetryAsync(cancellationToken).ConfigureAwait(false);
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        TryUnregister();
        return Task.CompletedTask;
    }

    private async Task RegisterWithRetryAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 1; attempt <= 20; attempt++)
        {
            if (TryRegister())
            {
                return;
            }

            await Task.Delay(TimeSpan.FromSeconds(Math.Min(attempt, 3)), cancellationToken).ConfigureAwait(false);
        }

        _logger.LogError("DINKFLIX could not register with File Transformation. Confirm File Transformation 3.x is installed and restart Jellyfin.");
    }

    private bool TryRegister()
    {
        try
        {
            var assembly = FindFileTransformationAssembly();
            if (assembly is null)
            {
                return false;
            }

            var interfaceType = assembly.GetType("Jellyfin.Plugin.FileTransformation.PluginInterface", throwOnError: false);
            if (interfaceType is null)
            {
                return false;
            }

            var register = interfaceType.GetMethod("RegisterTransformation", BindingFlags.Public | BindingFlags.Static);
            if (register is null)
            {
                return false;
            }

            var payloadType = register.GetParameters().FirstOrDefault()?.ParameterType;
            var parse = payloadType?.GetMethod(
                "Parse",
                BindingFlags.Public | BindingFlags.Static,
                binder: null,
                types: new[] { typeof(string) },
                modifiers: null);
            if (parse is null)
            {
                return false;
            }

            var payloadJson = JsonSerializer.Serialize(new
            {
                id = TransformationId,
                fileNamePattern = "index.html$",
                callbackAssembly = typeof(WebFileTransformation).Assembly.FullName,
                callbackClass = typeof(WebFileTransformation).FullName,
                callbackMethod = nameof(WebFileTransformation.TransformIndexHtml)
            });

            var payload = parse.Invoke(null, new object?[] { payloadJson });
            register.Invoke(null, new[] { payload });
            _logger.LogInformation("DINKFLIX File Transformation registered.");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "DINKFLIX File Transformation registration attempt failed.");
            return false;
        }
    }

    private void TryUnregister()
    {
        try
        {
            var assembly = FindFileTransformationAssembly();
            var interfaceType = assembly?.GetType("Jellyfin.Plugin.FileTransformation.PluginInterface", throwOnError: false);
            var remove = interfaceType?.GetMethod("RemoveTransformation", BindingFlags.Public | BindingFlags.Static);
            remove?.Invoke(null, new object?[] { TransformationId });
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "DINKFLIX File Transformation unregister attempt failed.");
        }
    }

    private static Assembly? FindFileTransformationAssembly()
    {
        return AssemblyLoadContext.All
            .SelectMany(static context => context.Assemblies)
            .FirstOrDefault(static candidate =>
                candidate.GetName().Name?.Contains("FileTransformation", StringComparison.OrdinalIgnoreCase) == true);
    }
}
