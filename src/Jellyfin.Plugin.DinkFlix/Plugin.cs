using System;
using System.Collections.Generic;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Jellyfin.Plugin.DinkFlix.Configuration;

namespace Jellyfin.Plugin.DinkFlix;

/// <summary>
/// DINKFLIX Web plugin entry point.
/// </summary>
public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    /// <summary>
    /// Stable DINKFLIX Web plugin identifier.
    /// </summary>
    public static readonly Guid PluginGuid = Guid.Parse("9b8e4d39-6a4c-4b5d-b6aa-d2b1c4f3c9e8");

    /// <summary>
    /// Gets the active plugin instance.
    /// </summary>
    public static Plugin? Instance { get; private set; }

    /// <summary>
    /// Initializes a new instance of the <see cref="Plugin"/> class.
    /// </summary>
    /// <param name="applicationPaths">Jellyfin application paths.</param>
    /// <param name="xmlSerializer">Jellyfin XML serializer.</param>
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    /// <inheritdoc />
    public override string Name => "DINKFLIX Web";

    /// <inheritdoc />
    public override Guid Id => PluginGuid;

    /// <inheritdoc />
    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = "DINKFLIX Web",
            EmbeddedResourcePath = "Jellyfin.Plugin.DinkFlix.Configuration.configPage.html",
            EnableInMainMenu = true,
            DisplayName = "DINKFLIX Web"
        };
    }
}
