import datetime
import os
import ee
import math
import sys
import json
from ee.ee_exception import EEException
from gee.inputs import getLandsat, getS1, getLandsatToa, getNICFI, getSentinel2Toa, calcNDVI, calcEVI, calcEVI2, calcNDMI, calcNDWI


########## Helper functions ##########


def initialize(ee_account='', ee_key_path=''):
    try:
        if ee_account and ee_key_path and os.path.exists(ee_key_path):
            credentials = ee.ServiceAccountCredentials(ee_account, ee_key_path)
            ee.Initialize(credentials)
        else:
            ee.Initialize()
    except Exception as e:
        print(e)


def getReducer(reducer):
    reducerName = reducer.lower()
    if(reducerName == 'min'):
        return ee.Reducer.min()
    elif (reducerName == 'max'):
        return ee.Reducer.max()
    elif (reducerName == 'mean'):
        return ee.Reducer.mean()
    elif (reducerName == 'mode'):
        return ee.Reducer.mode()
    elif (reducerName == 'first'):
        return ee.Reducer.first()
    elif (reducerName == 'last'):
        return ee.Reducer.last()
    elif (reducerName == 'sum'):
        return ee.Reducer.sum()
    else:
        return ee.Reducer.median()


def reduceIC(imageCollection, reducer):
    reducerName = reducer.lower()
    if(reducerName == 'min'):
        return imageCollection.min()
    elif (reducerName == 'max'):
        return imageCollection.max()
    elif (reducerName == 'mean'):
        return imageCollection.mean()
    elif (reducerName == 'mode'):
        return imageCollection.mode()
    elif (reducerName == 'mosaic'):
        return imageCollection.mosaic()
    elif (reducerName == 'first'):
        return imageCollection.first()
    elif (reducerName == 'sum'):
        return imageCollection.sum()
    else:
        return imageCollection.median()


def safeParseJSON(val):
    if isinstance(val,  dict):
        return val
    else:
        try:
            return json.loads(val)
        except Exception as e:
            try:
                return json.loads(val.replace("'", "\""))
            except Exception as e:
                return {}


########## Helper routes ##########


def listAvailableBands(name, assetType):
    eeImage = None
    if assetType == "imageCollection":
        eeImage = ee.ImageCollection(name).first()
    else:
        eeImage = ee.Image(name)
    return {
        'bands': eeImage.bandNames().getInfo(),
        'imageName': name
    }

########## ee.Image ##########


def imageToMapId(image, visParams):
    eeImage = ee.Image(image)
    mapId = eeImage.getMapId(visParams)
    # TODO, just return URL so the routes are easier to deduce whats being returned.
    return {
        'url': mapId['tile_fetcher'].url_format
    }

########## ee.ImageCollection ##########


def imageCollectionToMapId(assetId, visParams, reducer, startDate, endDate):
    eeCollection = ee.ImageCollection(assetId)
    if (startDate and endDate):
        eeFilterDate = ee.Filter.date(startDate, endDate)
        eeCollection = eeCollection.filter(eeFilterDate)

    reducedImage = ee.Image(reduceIC(eeCollection, reducer))
    return imageToMapId(reducedImage, visParams)

# TODO, should we allow user to select first cloud free image again?


def firstCloudFreeImageInMosaicToMapId(assetId, visParams, startDate, endDate):
    skipCloudMask = False
    eeCollection = ee.ImageCollection(assetId)
    lowerAsset = assetId.lower()
    if("b2" not in visParams["bands"].lower()):
        skipCloudMask = True
    elif ("lc8" in lowerAsset):
        skipCloudMask = False
    elif ("le7" in lowerAsset):
        skipCloudMask = False
    elif ("lt5" in lowerAsset):
        skipCloudMask = False
    else:
        skipCloudMask = True
    if (startDate and endDate):
        eeFilterDate = ee.Filter.date(startDate, endDate)
        eeCollection = eeCollection.filter(eeFilterDate)
    eeFirstImage = ee.Image(eeCollection.mosaic())
    try:
        if(skipCloudMask == False):
            sID = ''
            if ("lc8" in lowerAsset):
                sID = 'OLI_TIRS'
            elif ("le7" in lowerAsset):
                sID = 'ETM'
            elif ("lt5" in lowerAsset):
                sID = 'TM'
            scored = ee.Algorithms.Landsat.simpleCloudScore(
                eeFirstImage.set('SENSOR_ID', sID))
            mask = scored.select(['cloud']).lte(20)
            masked = eeFirstImage.updateMask(mask)
            values = imageToMapId(masked, visParams)
        else:
            values = imageToMapId(eeFirstImage, visParams)
    except EEException as ine:
        imageToMapId(eeFirstImage, visParams)
    return values

########## ee.FeatureCollection ##########


def getFeatureCollectionTileUrl(featureCollection, field, matchID, visParams):
    fc = ee.FeatureCollection(featureCollection)
    single = fc.filter(ee.Filter.equals(field, matchID))
    mapId = ee.Image().paint(single, 0, 2).getMapId(visParams)
    return mapId['tile_fetcher'].url_format

########## Pre defined ee.ImageCollection ##########

# Index Image Collection


def getLandSatMergedCollection(startDate, endDate):
    # note originally only used LS T1. New call is same as time series
    #  which pulls T1 & T2. Ask if we want this. 
    ls = getLandsatToa(**{'startDate':startDate, 'endDate':endDate})
    s2 = getSentinel2Toa({'adjustBands':True})
    return ls.merge(s2)


def filteredImageNDVIToMapId(startDate, endDate, source):
    eeCollection = filteredCollectionBySourceName(startDate, endDate, source)
    colorPalette = 'c9c0bf,435ebf,eee8aa,006400'
    visParams = {'opacity': 1, 'max': 1,
                 'min': -1, 'palette': colorPalette}
    image = eeCollection.select('NDVI').mean()
    return imageToMapId(image, visParams)


def filteredImageEVIToMapId(startDate, endDate, source):
    eeCollection = filteredCollectionBySourceName(startDate, endDate, source)
    colorPalette = 'F5F5F5,E6D3C5,C48472,B9CF63,94BF3D,6BB037,42A333,00942C,008729,007824,004A16'
    visParams = {'opacity': 1, 'max': 1,
                 'min': -1, 'palette': colorPalette}
    image = eeCollection.select('EVI').mean()
    return imageToMapId(image, visParams)


def filteredImageEVI2ToMapId(startDate, endDate, source):
    eeCollection = filteredCollectionBySourceName(startDate, endDate, source)
    colorPalette = 'F5F5F5,E6D3C5,C48472,B9CF63,94BF3D,6BB037,42A333,00942C,008729,007824,004A16'
    visParams = {'opacity': 1, 'max': 1,
                 'min': -1, 'palette': colorPalette}
    image = eeCollection.select('EVI2').mean()
    return imageToMapId(image, visParams)


def filteredImageNDMIToMapId(startDate, endDate, source):
    eeCollection = filteredCollectionBySourceName(startDate, endDate, source)
    colorPalette = '0000FE,2E60FD,31B0FD,00FEFE,50FE00,DBFE66,FEFE00,FFBB00,FF6F00,FE0000'
    visParams = {'opacity': 1, 'max': 1,
                 'min': -1, 'palette': colorPalette}
    image = eeCollection.select('NDMI').mean()
    return imageToMapId(image, visParams)


def filteredImageNDWIToMapId(startDate, endDate, source):
    eeCollection = filteredCollectionBySourceName(startDate, endDate, source)
    colorPalette = '505050,E8E8E8,00FF33,003300'
    visParams = {'opacity': 1, 'max': 1,
                 'min': -1, 'palette': colorPalette}
    image = eeCollection.select('NDWI').mean()
    return imageToMapId(image, visParams)

def filteredCollectionBySourceName(startDate, endDate, source):
    collection = None
    if source == 'landsat':
        collection = getLandsatToa(**{'startDate':startDate, 'endDate':endDate})
    elif source == 'sentinel2':
        collection =  getSentinel2Toa({'start':startDate, 'end':endDate})
    elif source == 'nicfi':
        collection = getNICFI({'start':startDate, 'end':endDate})
    
    return collection

def filteredImageByIndexToMapId(startDate, endDate, index, source):
    lowerIndex = index.lower()
    lowerSource = source.lower()
    if (lowerIndex == 'ndvi'):
        return filteredImageNDVIToMapId(startDate, endDate, lowerSource)
    elif (lowerIndex == 'evi'):
        return filteredImageEVIToMapId(startDate, endDate, lowerSource)
    elif (lowerIndex == 'evi2'):
        return filteredImageEVI2ToMapId(startDate, endDate, lowerSource)
    elif (lowerIndex == 'ndmi'):
        return filteredImageNDMIToMapId(startDate, endDate, lowerSource)
    elif (lowerIndex == 'ndwi'):
        return filteredImageNDWIToMapId(startDate, endDate, lowerSource)


def filteredImageCompositeToMapId(eeCollection, visParams, metadataCloudCoverMax):
    # todo: rename, this is only used for landsat
    eeCollection = eeCollection.filterMetadata(
        'CLOUD_COVER',
        'less_than',
        metadataCloudCoverMax
        )
    eeMosaicImage = medoid(eeCollection,  ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2'])

    return imageToMapId(eeMosaicImage, visParams)


def filteredNicfiCompositeToMapId(eeCollection, visParams):
    eeMosaicImage = medoid(eeCollection,  ['B','G','R','N'])

    return imageToMapId(eeMosaicImage, visParams)


def filteredSentinelComposite(visParams, startDate, endDate, metadataCloudCoverMax):
    def scaleAndCloudScore(img):
        rescale = img.divide(10000)
        score = ee.Image(1).subtract(cloudScoreSentinel2(rescale)).rename('cloudscore')
        return rescale.addBands(score)

    sentinel2 = ee.ImageCollection('COPERNICUS/S2')
    f2017s2 = sentinel2.filterDate(startDate, endDate).filterMetadata(
        'CLOUDY_PIXEL_PERCENTAGE', 'less_than', int(metadataCloudCoverMax))
    m2017s2 = f2017s2.map(scaleAndCloudScore)
    m2017s3 = m2017s2.qualityMosaic('cloudscore')
    return imageToMapId(m2017s3, visParams)


def filteredSentinelSARComposite(visParams, startDate, endDate):
    def toNatural(img):
        return ee.Image(10).pow(img.divide(10))

    def addRatioBands(img):
        # not using angle band
        vv = img.select('VV')
        vh = img.select('VH')
        vv_vh = vv.divide(vh).rename('VV/VH')
        vh_vv = vh.divide(vv).rename('VH/VV')
        return vv.addBands(vh).addBands(vv_vh).addBands(vh_vv)

    sentinel1 = ee.ImageCollection('COPERNICUS/S1_GRD')
    sentinel1 = sentinel1.filterDate(startDate, endDate) \
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')) \
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH')) \
        .filter(ee.Filter.eq('instrumentMode', 'IW'))

    sentinel1 = sentinel1.map(toNatural)
    sentinel1 = sentinel1.map(addRatioBands)
    median = sentinel1.median()
    return imageToMapId(median, visParams)


def cloudScoreLandsat(img):
    def rescale(img, exp, thresholds):
        return img.expression(exp, {'img': img}).subtract(thresholds[0]).divide(thresholds[1] - thresholds[0])

    score = ee.Image(1.0)
    score = score.min(rescale(img, 'img.BLUE', [0.1, 0.3]))
    score = score.min(rescale(img, 'img.RED + img.GREEN + img.BLUE', [0.2, 0.8]))
    score = score.min(
        rescale(img, 'img.NIR + img.SWIR1 + img.SWIR2', [0.3, 0.8]))
    # // Clouds are reasonably cool in temperature.
    score = score.min(rescale(img, 'img.TEMP', [300, 290]))
    ndsi = img.normalizedDifference(['GREEN', 'SWIR1'])
    score = score.min(rescale(ndsi, 'img', [0.8, 0.6]))
    score = ee.Image(1).subtract(score).rename('cloudscore')

    return img.addBands(score)


def cloudScoreSentinel2(img):
    def rescale(img, exp, thresholds):
        return img.expression(exp, {'img': img}).subtract(thresholds[0]).divide(thresholds[1] - thresholds[0])

    score = ee.Image(1.0)
    score = score.min(rescale(img, 'img.B2', [0.1, 0.3]))
    score = score.min(rescale(img, 'img.B4 + img.B3 + img.B2', [0.2, 0.8]))
    score = score.min(
        rescale(img, 'img.B8 + img.B11 + img.B12', [0.3, 0.8]))
    ndsi = img.normalizedDifference(['B3', 'B11'])
    return score.min(rescale(ndsi, 'img', [0.8, 0.6]))


def medoid(collection, distance_bands):
    def prepareMedoid(image):
        return (image.addBands(image.expression(
            'pow(image - median, 2)', {
                'image':image.select(distance_bands),
                'median': collection.select(distance_bands).median()
                })
            .reduce(ee.Reducer.sum())
            .sqrt()
            .multiply(-1)
            .rename('distanceToMedian')
            )
        )
    return collection.map(prepareMedoid).qualityMosaic('distanceToMedian')

    
########## Time Series ##########


def getTimeSeriesByCollectionAndIndex(assetId, indexName, scale, coords, startDate, endDate, reducer):
    geometry = None
    indexCollection = None
    if isinstance(coords[0], list):
        geometry = ee.Geometry.Polygon(coords)
    else:
        geometry = ee.Geometry.Point(coords)
    if indexName != None:
        indexCollection = ee.ImageCollection(assetId).filterDate(
            startDate, endDate).select(indexName)
    else:
        indexCollection = ee.ImageCollection(
            assetId).filterDate(startDate, endDate)

    def getIndex(image):
        theReducer = getReducer(reducer)
        if indexName != None:
            indexValue = image.reduceRegion(
                theReducer, geometry, scale).get(indexName)
        else:
            indexValue = image.reduceRegion(theReducer, geometry, scale)
        date = image.get('system:time_start')
        indexImage = ee.Image().set(
            'indexValue', [ee.Number(date), indexValue])
        return indexImage

    def getClipped(image):
        return image.clip(geometry)

    clippedcollection = indexCollection.map(getClipped)
    indexCollection1 = clippedcollection.map(getIndex)
    indexCollection2 = indexCollection1.aggregate_array('indexValue')
    return indexCollection2.getInfo()


def getTimeSeriesByIndex(sourceName, indexName, scale, coords, startDate, endDate, reducer, assetId, band):
 
    def reduceRegion(image):
        theReducer = getReducer(reducer)
        reduced = image.reduceRegion(
            theReducer, geometry=geometry, scale=scale, maxPixels=1e6, bestEffort=True)
        return ee.Feature(None, {
            'index': reduced.get('index'),
            'timeIndex': [image.get('system:time_start'), reduced.get('index')]
        })

    geometry = None
    if isinstance(coords[0], list) or isinstance(coords[0], tuple):
        geometry = ee.Geometry.Polygon(coords)
    else:
        geometry = ee.Geometry.Point(coords)

    if sourceName.lower() == 'landsat':
        collection = (getLandsatToa(startDate, endDate, geometry)
                      .select([indexName],['index']))
    elif sourceName.lower() == 'nicfi':
        collection = getNICFI({
            'start':startDate,
            'end':endDate
        }).select([indexName],['index'])
    elif sourceName.lower() == "custom":
        collection = (ee.ImageCollection(assetId)
                      .filterBounds(geometry).filterDate(startDate, endDate)).select([band],['index'])
    else:
        raise ValueError(f'imagery source {sourceName} is not implemented.') 
   
    result = ee.ImageCollection(ee.ImageCollection(collection).sort('system:time_start') \
        .distinct('system:time_start')) \
        .map(reduceRegion) \
        .filter(ee.Filter.neq('index', None)) \
        .aggregate_array('timeIndex') \
        .getInfo()

    return result

########## Degradation##########

def getDegradationTileUrlByDateS1(geometry, date, visParams):
    imDate = datetime.datetime.strptime(date, "%Y-%m-%d")
    befDate = imDate - datetime.timedelta(days=1)
    aftDate = imDate + datetime.timedelta(days=1)

    if isinstance(geometry[0], list):
        geometry = ee.Geometry.Polygon(geometry)
    else:
        geometry = ee.Geometry.Point(geometry)

    sentinel1Data = getS1({
        "targetBands": ['VV', 'VH', 'VV/VH'],
        'region': geometry})

    start = befDate.strftime('%Y-%m-%d')
    end = aftDate.strftime('%Y-%m-%d')

    selectedImage = sentinel1Data.filterDate(start, end).first()

    selectedImage = ee.Image(selectedImage)
    mapparams = selectedImage.getMapId(visParams)
    return mapparams['tile_fetcher'].url_format


def getDegradationPlotsByPointS1(geometry, start, end):
    if isinstance(geometry[0], list):
        geometry = ee.Geometry.Polygon(geometry)
    else:
        geometry = ee.Geometry.Point(geometry)

    sentinel1Data = getS1({
        "targetBands": ['VV', 'VH', 'VV/VH'],
        'region': geometry
    }).filterDate(start, end)

    def myimageMapper(img):
        theReducer = ee.Reducer.mean()
        indexValue = img.reduceRegion(theReducer, geometry, 30)
        date = img.get('system:time_start')
        visParams = {'bands': ['VV', 'VH', 'ratioVVVH'],
                     'min': [-15, -25, .40], 'max': [0, -10, 1], 'gamma': 1.6}
        indexImage = ee.Image().set(
            'indexValue', [ee.Number(date), indexValue])
        return indexImage
    lsd = sentinel1Data.map(myimageMapper, True)
    indexCollection2 = lsd.aggregate_array('indexValue')
    values = indexCollection2.getInfo()
    return values


def getDegradationTileUrlByDate(geometry, date, visParams):
    imDate = datetime.datetime.strptime(date, "%Y-%m-%d")
    startDate = imDate - datetime.timedelta(days=1)
    endDate = imDate + datetime.timedelta(days=1)
    if isinstance(geometry[0], list):
        geometry = ee.Geometry.Polygon(geometry)
    else:
        geometry = ee.Geometry.Point(geometry)
    landsatData = getLandsat({
        "start": startDate.strftime('%Y-%m-%d'),
        "end": endDate.strftime('%Y-%m-%d'),
        "targetBands": ['RED', 'GREEN', 'BLUE', 'SWIR1', 'NIR'],
        "region": geometry,
        "sensors": {"l4": False, "l5": False, "l7": False, "l8": True}
    })

    selectedImage = landsatData.first()
    unmasked = ee.Image(selectedImage).multiply(10000).toInt16().unmask()
    mapparams = unmasked.getMapId(visParams)
    return mapparams['tile_fetcher'].url_format


def getDegradationPlotsByPoint(geometry, start, end, band):
    if isinstance(geometry[0], list):
        geometry = ee.Geometry.Polygon(geometry)
    else:
        geometry = ee.Geometry.Point(geometry)
    landsatData = getLandsat({
        "start": start,
        "end": end,
        "targetBands": [band],
        "region": geometry,
        "sensors": {"l4": True, "l5": True, "l7": True, "l8": True}
    })

    def myImageMapper(img):
        theReducer = ee.Reducer.mean()
        indexValue = img.reduceRegion(theReducer, geometry, 30)
        date = img.get('system:time_start')
        indexImage = ee.Image().set(
            'indexValue',
            [ee.Number(date), indexValue]
        )
        return indexImage
    lsd = landsatData.map(myImageMapper, True)
    indexCollection2 = lsd.aggregate_array('indexValue')
    values = indexCollection2.getInfo()
    return values


########## Stats ##########

def getStatistics(extent):
    extentGeom = ee.Geometry.Polygon(extent)
    elevation = ee.Image('USGS/GTOPO30')
    population = ee.ImageCollection("CIESIN/GPWv411/GPW_Population_Count").sort('system:time_start',False).first()

    def reduceElev():
        minmaxElev = elevation.reduceRegion(**{
            'reducer':ee.Reducer.minMax(),
            'geometry' :extentGeom, 
            'scale':30,
            'bestEffort':True, 
            'maxPixels':1e13
            
        })

        return ee.Dictionary({
            'minElev': minmaxElev.get('elevation_min'),
            'maxElev': minmaxElev.get('elevation_max'),
        })
    
    def reducePop ():
        popDict = population.reduceRegion(**{
            'reducer':ee.Reducer.sum().unweighted(),
            'geometry': extentGeom, 
            'maxPixels':1e13,
            'scale':927.67  
        })
        pop = ee.Number(popDict.get('population_count')).int()
        return ee.Dictionary({'pop':pop})

    def sampleElve():
        centriod = extentGeom.centroid(1)
        sampleElv =  elevation.reduceRegion(**{
            'reducer':ee.Reducer.first(),
            'geometry': centriod, 
            'maxPixels':1e13,
            'scale':30  
        })
        return ee.Dictionary({
            'minElev': sampleElv.get('elevation'),
            'maxElev': sampleElv.get('elevation'),
        })

    def samplePop():
        centriod = extentGeom.centroid(1)
        sample = population.reduceRegion(**{
            'reducer':ee.Reducer.first(),
            'geometry': centriod, 
            'maxPixels':1e13,
            'scale':927.67  
        })
        pop = ee.Number(sample.get('population_count')).int()
        return ee.Dictionary({'pop':pop})

    # ~900m = 30m2
    conditionSampleElev = extentGeom.area(1).lt(900).getInfo()
    # ~859,329m = 927.67m2
    conditionSamplePop = extentGeom.area(1).lt(860000).getInfo()
    
    if conditionSampleElev:
        elevationResults = sampleElve()
    else:
        elevationResults = reduceElev()
    
    if conditionSamplePop:
        populationResults = samplePop()
    else:
        populationResults = reducePop()

    return elevationResults.combine(populationResults).getInfo()