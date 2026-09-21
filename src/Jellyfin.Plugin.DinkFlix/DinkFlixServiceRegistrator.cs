using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.DinkFlix;

/// <summary>
/// Registers DINKFLIX with Jellyfin's File Transformation plugin.
/// </summary>
public sealed class DinkFlixServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        serviceCollection.AddHostedService<FileTransformationRegistrationService>();
    }
}
