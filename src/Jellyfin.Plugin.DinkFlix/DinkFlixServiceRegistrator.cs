using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using MediaBrowser.Model.Tasks;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.DinkFlix;

/// <summary>
/// Registers the DINKFLIX startup task used to connect the frontend to File Transformation.
/// </summary>
public sealed class DinkFlixServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        serviceCollection.AddSingleton<IScheduledTask, DinkFlixStartupService>();
    }
}
