using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.DinkFlix.Services;

/// <summary>
/// Registers the DINKFLIX index.html transformation with File Transformation.
/// </summary>
public sealed class FileTransformationRegistrationService : IHostedService
{
    private static readonly Guid TransformationGuid = Guid.Parse("4aa2d9bf-d9d6-4f56-b3f8-7c0e8eecfb72");
    private readonly ILogger<FileTransformationRegistrationService> _logger;
    private Task? _registrationTask;

    /// <summary>
    /// Initializes a new instance of the <see cref="FileTransformationRegistrationService"/> class.
    /// </summary>
    /// <param name="logger">Plugin logger.</param>
    public FileTransformationRegistrationService(ILogger<FileTransformationRegistrationService> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public Task StartAsync(CancellationToken cancellationToken)
    {
        _registrationTask = RegisterWithRetryAsync(cancellationToken);
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public async Task StopAsync(CancellationToken cancellationToken)
    {
        try
        {
            if (_registrationTask is not null)
            {
                await _registrationTask.WaitAsync(cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Server shutdown is already underway.
        }

        TryUnregister();
    }

    private async Task RegisterWithRetryAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 1; attempt <= 20; attempt++)
        {
            if (TryRegister())
            {
                return;
            }

            await Task.Delay(TimeSpan.FromSeconds(Math.Min(attempt, 3)), cancellationToken);
        }

        _logger.LogError("DINKFLIX Web could not register its File Transformation hook. Confirm File Transformation 3.x is installed and restart Jellyfin.");
    }

    private bool TryRegister()
    {
        try
        {
            var assembly = FindFileTransformationAssembly();
            if (assembly is null)
            {
                _logger.LogDebug("DINKFLIX Web is waiting for File Transformation to load.");
                return false;
            }

            var interfaceType = assembly.GetType("Jellyfin.Plugin.FileTransformation.PluginInterface", throwOnError: false);
            if (interfaceType is null)
            {
                _logger.LogWarning("DINKFLIX Web found File Transformation, but its PluginInterface type was unavailable.");
                return false;
            }

            var register = interfaceType.GetMethod("RegisterTransformation", BindingFlags.Public | BindingFlags.Static);
            var payloadType = register?.GetParameters().FirstOrDefault()?.ParameterType;
            var parse = payloadType?.GetMethod("Parse", BindingFlags.Public | BindingFlags.Static, null, [typeof(string)], null);
            if (register is null || parse is null)
            {
                _logger.LogWarning("DINKFLIX Web found File Transformation, but its RegisterTransformation payload type could not be resolved.");
                return false;
            }

            var payloadJson = JsonSerializer.Serialize(new
            {
                id = TransformationGuid,
                fileNamePattern = "index.html",
                callbackAssembly = typeof(WebFileTransformation).Assembly.FullName,
                callbackClass = typeof(WebFileTransformation).FullName,
                callbackMethod = nameof(WebFileTransformation.TransformIndexHtml)
            });

            var payload = parse.Invoke(null, [payloadJson]);
            register.Invoke(null, [payload]);
            _logger.LogInformation("DINKFLIX Web File Transformation registered successfully.");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "DINKFLIX Web File Transformation registration attempt failed.");
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
            remove?.Invoke(null, [TransformationGuid]);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "DINKFLIX Web File Transformation unregister attempt failed.");
        }
    }

    private static Assembly? FindFileTransformationAssembly()
    {
        return AssemblyLoadContext.All
            .SelectMany(static context => context.Assemblies)
            .FirstOrDefault(static candidate => candidate.GetName().Name?.Contains("FileTransformation", StringComparison.OrdinalIgnoreCase) == true);
    }
}
