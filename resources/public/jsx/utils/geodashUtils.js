export function getGatewayPath (widget, collectionName) {
    const fts = {
        "LANDSAT5": "Landsat5Filtered",
        "LANDSAT7": "Landsat7Filtered",
        "LANDSAT8": "Landsat8Filtered",
        "Sentinel2": "FilteredSentinel",
    };
    return (widget.filterType && widget.filterType.length > 0)
        ? fts[widget.filterType]
        : (widget.ImageAsset && widget.ImageAsset.length > 0)
            ? "image"
            : (widget.ImageCollectionAsset && widget.ImageCollectionAsset.length > 0)
                ? "ImageCollectionAsset"
                : (widget.featureCollection && widget.featureCollection.length > 0)
                    ? "getTileUrlFromFeatureCollection"
                    : (widget.properties && "ImageCollectionCustom" === widget.properties[0])
                        ? "meanImageByMosaicCollections"
                        : (collectionName.trim().length > 0)
                            ? "cloudMaskImageByMosaicCollection"
                            : "ImageCollectionbyIndex";
}
