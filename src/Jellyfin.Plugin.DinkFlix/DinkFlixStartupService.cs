using System.Reflection;
using System.Runtime.Loader;
using MediaBrowser.Model.Tasks;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

namespace Jellyfin.Plugin.DinkFlix;

/// <summary>
/// Registers DINKFLIX with the installed File Transformation plugin at Jellyfin startup.
/// This mirrors the registration pattern used by established File Transformation plugins.
/// </summary>
public sealed class DinkFlixStartupService : IScheduledTask
{
    private static readonly Guid TransformationId = Guid.Parse("7e6bf7fd-1b0d-4e7f-a580-83c2c50e9f9d");

    private readonly ILogger<DinkFlixStartupService> _logger;

    public DinkFlixStartupService(ILogger<DinkFlixStartupService> logger)
    {
        _logger = logger;
    }

    public string Name => "DINKFLIX Web Startup";

    public string Key => "Jellyfin.Plugin.DinkFlix.Startup";

    public string Description => "Registers the DINKFLIX Web frontend with File Transformation.";

    public string Category => "Startup Services";

    public bool IsHidden => true;

    public bool IsEnabled => true;

    public bool IsLogged => true;

    public IEnumerable<TaskTriggerInfo> GetDefaultTriggers()
    {
        yield return new TaskTriggerInfo
        {
            Type = TaskTriggerInfoType.StartupTrigger
        };
    }

    public Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken)
    {
        progress.Report(0);
        RegisterTransformation();
        progress.Report(100);
        return Task.CompletedTask;
    }

    private void RegisterTransformation()
    {
        try
        {
            Assembly? fileTransformationAssembly = AssemblyLoadContext.All
                .SelectMany(context => context.Assemblies)
                .FirstOrDefault(assembly =>
                    assembly.FullName?.Contains(".FileTransformation", StringComparison.OrdinalIgnoreCase) == true);

            if (fileTransformationAssembly is null)
            {
                _logger.LogWarning("DINKFLIX could not find File Transformation. Install a Jellyfin 12-compatible File Transformation plugin.");
                return;
            }

            Type? pluginInterfaceType =
                fileTransformationAssembly.GetType("Jellyfin.Plugin.FileTransformation.PluginInterface");

            if (pluginInterfaceType is null)
            {
                _logger.LogWarning("DINKFLIX found File Transformation but could not resolve PluginInterface.");
                return;
            }

            JObject payload = new JObject
            {
                ["id"] = TransformationId.ToString(),
                ["fileNamePattern"] = "index.html",
                ["callbackAssembly"] = GetType().Assembly.FullName,
                ["callbackClass"] = typeof(WebFileTransformation).FullName,
                ["callbackMethod"] = nameof(WebFileTransformation.TransformIndexHtml)
            };

            pluginInterfaceType
                .GetMethod("RegisterTransformation")
                ?.Invoke(null, new object?[] { payload });

            _logger.LogInformation("DINKFLIX registered its index.html transformation with File Transformation.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DINKFLIX could not register its File Transformation hook.");
        }
    }
}
