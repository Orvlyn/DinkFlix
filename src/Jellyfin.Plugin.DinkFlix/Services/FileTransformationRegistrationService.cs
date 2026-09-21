using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.DinkFlix.Services;

public sealed class FileTransformationRegistrationService : IHostedService
{
    private const string TransformationId = "dinkflix-web-v2-index";
    private readonly ILogger<FileTransformationRegistrationService> _logger;
    private Task? _registrationTask;

    public FileTransformationRegistrationService(ILogger<FileTransformationRegistrationService> logger)
    {
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _registrationTask = RegisterWithRetryAsync(cancellationToken);
        return Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_registrationTask is null) return;
        try { await _registrationTask.WaitAsync(cancellationToken); }
        catch (OperationCanceledException) { }
    }

    private async Task RegisterWithRetryAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 1; attempt <= 12; attempt++)
        {
            if (TryRegister()) return;
            await Task.Delay(TimeSpan.FromSeconds(Math.Min(attempt, 3)), cancellationToken);
        }

        _logger.LogWarning("DINKFLIX Web could not register its File Transformation hook. The plugin will remain loaded, but the frontend will not be injected until a later server restart/reload.");
    }

    private bool TryRegister()
    {
        try
        {
            var assembly = AssemblyLoadContext.All
                .SelectMany(static context => context.Assemblies)
                .FirstOrDefault(static candidate => candidate.GetName().Name?.Contains("FileTransformation", StringComparison.OrdinalIgnoreCase) == true);

            if (assembly is null)
            {
                _logger.LogDebug("DINKFLIX Web is waiting for File Transformation.");
                return false;
            }

            var interfaceType = assembly.GetType("Jellyfin.Plugin.FileTransformation.PluginInterface", throwOnError: false);
            if (interfaceType is null)
            {
                _logger.LogWarning("DINKFLIX Web found File Transformation but its registration API was not available.");
                return false;
            }

            var register = interfaceType.GetMethod("RegisterTransformation", BindingFlags.Public | BindingFlags.Static);
            var payloadType = register?.GetParameters().FirstOrDefault()?.ParameterType;
            var parse = payloadType?.GetMethod("Parse", BindingFlags.Public | BindingFlags.Static, null, new[] { typeof(string) }, null);
            if (register is null || parse is null)
            {
                _logger.LogWarning("DINKFLIX Web found File Transformation but could not resolve RegisterTransformation/Parse.");
                return false;
            }

            var payloadJson = JsonSerializer.Serialize(new
            {
                id = TransformationId,
                fileNamePattern = "index.html",
                callbackAssembly = typeof(WebFileTransformation).Assembly.FullName,
                callbackClass = typeof(WebFileTransformation).FullName,
                callbackMethod = nameof(WebFileTransformation.TransformIndexHtml)
            });

            var payload = parse.Invoke(null, new object?[] { payloadJson });
            register.Invoke(null, new[] { payload });
            _logger.LogInformation("DINKFLIX Web File Transformation registered successfully.");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "DINKFLIX Web File Transformation registration attempt failed.");
            return false;
        }
    }
}
