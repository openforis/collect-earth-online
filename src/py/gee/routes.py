from distutils.util import strtobool
import json

from gee.utils import initialize, listAvailableBands, imageToMapId, imageCollectionToMapId, \
    filteredImageCompositeToMapId, filteredSentinelComposite, filteredSentinelSARComposite, \
    filteredImageByIndexToMapId, getFeatureCollectionTileUrl, getTimeSeriesByCollectionAndIndex, \
    getTimeSeriesByIndex, getStatistics, getDegradationPlotsByPoint, getDegradationPlotsByPointS1, \
    getDegradationTileUrlByDate, getDegradationTileUrlByDateS1, safeParseJSON, filteredNicfiCompositeToMapId
from gee.planet import getPlanetMapID
from gee.inputs import getLandsatToa, getTFO


def safeListGet(l, idx, default=None):
    try:
        return l[idx]
    except IndexError:
        return default


def getDefault(dict, key, default=None):
    val = dict.get(key)
    if val is None or val == '':
        return default
    else:
        return val

# ########## Helper routes ##########

def getAvailableBands(requestDict):
    values = listAvailableBands(
        getDefault(requestDict, 'assetId'),
        getDefault(requestDict, 'assetType')
    )
    return values

# ########## ee.Image ##########


def image(requestDict):
    values = imageToMapId(
        getDefault(requestDict, 'assetId'),
        safeParseJSON(getDefault(requestDict, 'visParams', {}))
    )
    return values

# ########## ee.ImageCollection ##########


def imageCollection(requestDict):
    visParams = safeParseJSON(getDefault(requestDict, 'visParams', {}))
    if visParams.get("bands") and isinstance(visParams.get("bands"), str):
        bands = visParams.get("bands").replace(' ', '')
        visParams.update({"bands": bands})
    values = imageCollectionToMapId(
        getDefault(requestDict, 'assetId', None),
        visParams,
        getDefault(requestDict, 'reducer', 'Mean'),
        getDefault(requestDict, 'startDate', None),
        getDefault(requestDict, 'endDate', None)
    )
    return values


# ########## Pre defined ee.ImageCollection ##########

def filteredLandsat(requestDict):
    startDate = getDefault(requestDict, 'startDate', '1990-01-01')
    endDate = getDefault(requestDict, 'endDate', '2023-01-01')
    values = filteredImageCompositeToMapId(
        getLandsatToa(startDate, endDate),
        {
            'min': getDefault(requestDict, 'min', '0.03,0.01,0.05'),
            'max': getDefault(requestDict, 'max', '0.45,0.5,0.4'),
            'bands': getDefault(requestDict, 'bands', 'BLUE,RED,GREEN')
        },
        getDefault(requestDict, 'cloudLessThan', 60),
    )
    return values

def filteredNicfi(requestDict):
    startDate = getDefault(requestDict, 'startDate', '1990-01-01')
    endDate = getDefault(requestDict, 'endDate', '2023-01-01')
    values = filteredNicfiCompositeToMapId(
        getTFO({'start':startDate, 'end':endDate}),
        {
            'min': getDefault(requestDict, 'min', '113,113,113'),
            'max': getDefault(requestDict, 'max', '1465,1465,1465'),
            'bands': getDefault(requestDict, 'bands', 'R,G,B')
        },
    )
    return values

def filteredSentinel2(requestDict):
    values = filteredSentinelComposite(
        {
            'min': getDefault(requestDict, 'min', '0.03,0.01,0.05'),
            'max': getDefault(requestDict, 'max', '0.45,0.5,0.4'),
            'bands': getDefault(requestDict, 'bands', 'B4,B5,B3')
        },
        getDefault(requestDict, 'startDate', '2010-01-01'),
        getDefault(requestDict, 'endDate', '2022-01-01'),
        getDefault(requestDict, 'cloudLessThan', 90)
    )
    return values


# # Only used for institution imagery


def filteredSentinelSAR(requestDict):
    values = filteredSentinelSARComposite(
        {
            'min': getDefault(requestDict, 'min', '0'),
            'max': getDefault(requestDict, 'max', '0.3'),
            'bands': getDefault(requestDict, 'bands', 'VH,VV,VH/VV')
        },
        getDefault(requestDict, 'startDate', None),
        getDefault(requestDict, 'endDate', None)
    )
    return values


def imageCollectionByIndex(requestDict):
    values = filteredImageByIndexToMapId(
        getDefault(requestDict, 'startDate', '1990-01-01'),
        getDefault(requestDict, 'endDate', '2100-01-01'),
        getDefault(requestDict, 'indexName'),
        getDefault(requestDict, 'sourceName')
    )
    return values


# ########## ee.FeatureCollection ##########


# # TODO, this route inst really generic to any feature collections like the name suggests.
def featureCollection(requestDict):
    visParams = safeParseJSON(getDefault(requestDict, 'visParams', {}))
    values = {
        'url': getFeatureCollectionTileUrl(
            getDefault(requestDict, 'assetId', None),
            getDefault(requestDict, 'field', 'PLOTID'),
            int(getDefault(requestDict, 'matchID', 1)),
            {'max': 1, 'palette': ['red']} if visParams == {} else visParams
        )
    }
    return values

# ########## Planet ##########


def getPlanetTile(requestDict):
    values = getPlanetMapID(
        getDefault(requestDict, 'apiKey'),
        getDefault(requestDict, 'geometry'), getDefault(
            requestDict, 'startDate'),
        getDefault(requestDict, 'endDate', None),
        getDefault(requestDict, 'layerCount', 1),
        getDefault(requestDict, 'itemTypes', [
                    'PSScene3Band', 'PSScene4Band']),
        float(getDefault(requestDict, 'buffer', 0.5)),
        bool(strtobool(getDefault(requestDict, 'addsimilar', 'True')))
    )
    return values

# ########## Time Series ##########

def timeSeriesByIndex(requestDict):
    values = {
        'timeseries': getTimeSeriesByIndex(
            getDefault(requestDict, 'sourceName', 'Landsat'),
            getDefault(requestDict, 'indexName', 'NDVI'),
            float(getDefault(requestDict, 'scale', 30)),
            getDefault(requestDict, 'geometry', None),
            getDefault(requestDict, 'startDate', None),
            getDefault(requestDict, 'endDate', None),
            'median',
            getDefault(requestDict, 'assetId', None), # assetId is needed for the sourceName=='custom' case now
            getDefault(requestDict, 'band', None), # band is needed for the sourceName=='custom' case now


        )
    }
    return values

# ########## Degradation##########


def degradationTimeSeries(requestDict):
    if getDefault(requestDict, 'dataType', 'landsat') == 'landsat':
        values = {
            'timeseries': getDegradationPlotsByPoint(
                getDefault(requestDict, 'geometry'),
                getDefault(requestDict, 'startDate'),
                getDefault(requestDict, 'endDate'),
                getDefault(requestDict, 'band', 'NDFI')
            )
        }
    else:
        values = {
            'timeseries': getDegradationPlotsByPointS1(
                getDefault(requestDict, 'geometry'),
                getDefault(requestDict, 'startDate'),
                getDefault(requestDict, 'endDate')
            )
        }
    return values


def degradationTileUrl(requestDict):
    imageDate = getDefault(requestDict, 'imageDate', None)
    geometry = getDefault(requestDict, 'geometry')
    if getDefault(requestDict, 'degDataType', 'landsat') == 'landsat':
        stretch = getDefault(requestDict, 'stretch', 321)
        if stretch == 321:
            visParams = {'bands': 'RED,GREEN,BLUE', 'min': 0, 'max': 2000}
        elif stretch == 543:
            visParams = {'bands': 'SWIR1,NIR,RED', 'min': 0, 'max': 7000}
        elif stretch == 453:
            visParams = {'bands': 'NIR,SWIR1,RED', 'min': 0, 'max': 7000}
        values = {
            'url': getDegradationTileUrlByDate(geometry, imageDate, visParams)
        }
    else:
        values = {
            'url': getDegradationTileUrlByDateS1(
                geometry,
                imageDate,
                {
                    'bands': 'VV,VH,VV/VH',
                    'min': '-15,-25,.40',
                    'max': '0,-10,1',
                    'gamma': '1.6'
                })
        }
    return values

# ########## DynamicWorld ##########

def dynamicWorld(requestDict):    
    geometry = getDefault(requestDict, 'geometry')
    startDate="2021-01-01"
    endDate="2022-01-01"
    visParams = safeParseJSON(getDefault(requestDict, 'visParams', {}))
    return imageCollectionToMapId("GOOGLE/DYNAMICWORLD/V1", visParams, 'Mode', startDate, endDate)


# ########## Stats ##########


def statistics(requestDict):
    values = getStatistics(getDefault(requestDict, 'extent', None))    
    return {url: values}
