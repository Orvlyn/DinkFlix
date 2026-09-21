using Microsoft.Extensions.DependencyInjection;
using MediaBrowser.Controller.Plugins;

namespace Jellyfin.Plugin.DinkFlix.Services;

public sealed class PluginServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection serviceCollection)
    {
        serviceCollection.AddHostedService<FileTransformationRegistrationService>();
    }
}
