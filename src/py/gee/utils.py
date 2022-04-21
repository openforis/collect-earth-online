import datetime
import os
import ee
import math
import sys
import json
from ee.ee_exception import EEException
from gee.inputs import getLandsat, getS1


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


def lsMaskClouds(img, cloudThresh=10):
    score = ee.Image(1.0)
    # Clouds are reasonably bright in the blue band.
    blue_rescale = img.select('blue').subtract(ee.Number(0.1)).divide(
        ee.Number(0.3).subtract(ee.Number(0.1)))
    score = score.min(blue_rescale)

    # Clouds are reasonably bright in all visible bands.
    visible = img.select('red').add(
        img.select('green')).add(img.select('blue'))
    visible_rescale = visible.subtract(ee.Number(0.2)).divide(
        ee.Number(0.8).subtract(ee.Number(0.2)))
    score = score.min(visible_rescale)

    # Clouds are reasonably bright in all infrared bands.
    infrared = img.select('nir').add(
        img.select('swir1')).add(img.select('swir2'))
    infrared_rescale = infrared.subtract(ee.Number(0.3)).divide(
        ee.Number(0.8).subtract(ee.Number(0.3)))
    score = score.min(infrared_rescale)

    # Clouds are reasonably cool in temperature.
    temp_rescale = img.select('temp').subtract(ee.Number(300)).divide(
        ee.Number(290).subtract(ee.Number(300)))
    score = score.min(temp_rescale)

    # However, clouds are not snow.
    ndsi = img.normalizedDifference(['green', 'swir1'])
    ndsi_rescale = ndsi.subtract(ee.Number(0.8)).divide(
        ee.Number(0.6).subtract(ee.Number(0.8)))
    score = score.min(ndsi_rescale).multiply(100).byte()
    mask = score.lt(cloudThresh).rename(['cloudMask'])
    img = img.updateMask(mask)
    return img.addBands(score)


def s2MaskClouds(img):
    qa = img.select('QA60')

    # Bits 10 and 11 are clouds and cirrus, respectively.
    cloudBitMask = int(math.pow(2, 10))
    cirrusBitMask = int(math.pow(2, 11))

    # clear if both flags set to zero.
    clear = qa.bitwiseAnd(cloudBitMask).eq(0).And(
        qa.bitwiseAnd(cirrusBitMask).eq(0))

    return img.divide(10000).updateMask(clear).set('system:time_start', img.get('system:time_start'))


def bandPassAdjustment(img):
    keep = img.select(['temp'])
    bands = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2']
    # linear regression coefficients for adjustment
    gain = ee.Array([[0.977], [1.005], [0.982], [1.001], [1.001], [0.996]])
    bias = ee.Array([[-0.00411], [-0.00093], [0.00094],
                    [-0.00029], [-0.00015], [-0.00097]])
    # Make an Array Image, with a 2-D Array per pixel.
    arrayImage2D = img.select(bands).toArray().toArray(1)

    # apply correction factors and reproject array to geographic image
    componentsImage = ee.Image(gain).multiply(arrayImage2D).add(ee.Image(bias)) \
        .arrayProject([0]).arrayFlatten([bands]).float()

    # .set('system:time_start',img.get('system:time_start'));
    return keep.addBands(componentsImage)


def getLandSatMergedCollection():
    sensorBandDictLandsatTOA = {'L8': [1, 2, 3, 4, 5, 9, 6],
                                'L7': [0, 1, 2, 3, 4, 5, 7],
                                'L5': [0, 1, 2, 3, 4, 5, 6],
                                'L4': [0, 1, 2, 3, 4, 5, 6],
                                'S2': [1, 2, 3, 7, 11, 10, 12]}
    bandNamesLandsatTOA = ['blue', 'green',
                           'red', 'nir', 'swir1', 'temp', 'swir2']
    metadataCloudCoverMax = 100
    lt4 = ee.ImageCollection('LANDSAT/LT4_L1T_TOA') \
        .filterMetadata('CLOUD_COVER', 'less_than', metadataCloudCoverMax) \
        .select(sensorBandDictLandsatTOA['L4'], bandNamesLandsatTOA).map(lsMaskClouds)
    lt5 = ee.ImageCollection('LANDSAT/LT5_L1T_TOA') \
        .filterMetadata('CLOUD_COVER', 'less_than', metadataCloudCoverMax) \
        .select(sensorBandDictLandsatTOA['L5'], bandNamesLandsatTOA).map(lsMaskClouds)
    le7 = ee.ImageCollection('LANDSAT/LE7_L1T_TOA') \
        .filterMetadata('CLOUD_COVER', 'less_than', metadataCloudCoverMax) \
        .select(sensorBandDictLandsatTOA['L7'], bandNamesLandsatTOA).map(lsMaskClouds)
    lc8 = ee.ImageCollection('LANDSAT/LC08/C01/T1_TOA') \
        .filterMetadata('CLOUD_COVER', 'less_than', metadataCloudCoverMax) \
        .select(sensorBandDictLandsatTOA['L8'], bandNamesLandsatTOA).map(lsMaskClouds)
    s2 = ee.ImageCollection('COPERNICUS/S2') \
        .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', metadataCloudCoverMax) \
        .map(s2MaskClouds).select(sensorBandDictLandsatTOA['S2'], bandNamesLandsatTOA) \
        .map(bandPassAdjustment)
    return ee.ImageCollection(lt4.merge(lt5).merge(le7).merge(lc8).merge(s2))


def filteredImageNDVIToMapId(startDate, endDate):
    def calcNDVI(img):
        return img.expression('(i.nir - i.red) / (i.nir + i.red)',  {'i': img}).rename(['NDVI']) \
            .set('system:time_start', img.get('system:time_start'))

    eeCollection = getLandSatMergedCollection().filterDate(startDate, endDate)
    colorPalette = 'c9c0bf,435ebf,eee8aa,006400'
    visParams = {'opacity': 1, 'max': 1,
                 'min': -1, 'palette': colorPalette}
    eviImage = ee.Image(eeCollection.map(calcNDVI).mean())
    return imageToMapId(eviImage, visParams)


def filteredImageEVIToMapId(startDate, endDate):
    def calcEVI(img):
        return img.expression('2.5 * (i.nir - i.red) / (i.nir + 6.0 * i.red - 7.5 * i.blue + 1)',  {'i': img}).rename(['EVI']) \
            .set('system:time_start', img.get('system:time_start'))

    eeCollection = getLandSatMergedCollection().filterDate(startDate, endDate)
    colorPalette = 'F5F5F5,E6D3C5,C48472,B9CF63,94BF3D,6BB037,42A333,00942C,008729,007824,004A16'
    visParams = {'opacity': 1, 'max': 1,
                 'min': -1, 'palette': colorPalette}
    eviImage = ee.Image(eeCollection.map(calcEVI).mean())
    return imageToMapId(eviImage, visParams)


def filteredImageEVI2ToMapId(startDate, endDate):
    def calcEVI2(img):
        return img.expression('2.5 * (i.nir - i.red) / (i.nir + 2.4 * i.red + 1)',  {'i': img}).rename(['EVI2']) \
            .set('system:time_start', img.get('system:time_start'))

    eeCollection = getLandSatMergedCollection().filterDate(startDate, endDate)
    colorPalette = 'F5F5F5,E6D3C5,C48472,B9CF63,94BF3D,6BB037,42A333,00942C,008729,007824,004A16'
    visParams = {'opacity': 1, 'max': 1,
                 'min': -1, 'palette': colorPalette}
    eviImage = ee.Image(eeCollection.map(calcEVI2).mean())
    return imageToMapId(eviImage, visParams)


def filteredImageNDMIToMapId(startDate, endDate):
    def calcNDMI(img):
        return img.expression('(i.nir - i.swir1) / (i.nir + i.swir1)',  {'i': img}).rename(['NDMI']) \
            .set('system:time_start', img.get('system:time_start'))

    eeCollection = getLandSatMergedCollection().filterDate(startDate, endDate)
    colorPalette = '0000FE,2E60FD,31B0FD,00FEFE,50FE00,DBFE66,FEFE00,FFBB00,FF6F00,FE0000'
    visParams = {'opacity': 1, 'max': 1,
                 'min': -1, 'palette': colorPalette}
    eviImage = ee.Image(eeCollection.map(calcNDMI).mean())
    return imageToMapId(eviImage, visParams)


def filteredImageNDWIToMapId(startDate, endDate):
    def calcNDWI(img):
        return img.expression('(i.green - i.nir) / (i.green + i.nir)',  {'i': img}).rename(['NDWI']) \
            .set('system:time_start', img.get('system:time_start'))

    eeCollection = getLandSatMergedCollection().filterDate(startDate, endDate)
    colorPalette = '505050,E8E8E8,00FF33,003300'
    visParams = {'opacity': 1, 'max': 1,
                 'min': -1, 'palette': colorPalette}
    eviImage = ee.Image(eeCollection.map(calcNDWI).mean())
    return imageToMapId(eviImage, visParams)


def filteredImageByIndexToMapId(startDate, endDate, index):
    lowerIndex = index.lower()
    if (lowerIndex == 'ndvi'):
        return filteredImageNDVIToMapId(startDate, endDate)
    elif (lowerIndex == 'evi'):
        return filteredImageEVIToMapId(startDate, endDate)
    elif (lowerIndex == 'evi2'):
        return filteredImageEVI2ToMapId(startDate, endDate)
    elif (lowerIndex == 'ndmi'):
        return filteredImageNDMIToMapId(startDate, endDate)
    elif (lowerIndex == 'ndwi'):
        return filteredImageNDWIToMapId(startDate, endDate)


def filteredImageCompositeToMapId(assetId, visParams, startDate, endDate, metadataCloudCoverMax, simpleCompositeVariable):
    eeCollection = ee.ImageCollection(assetId)
    if (startDate and endDate):
        eeCollection = eeCollection.filterDate(startDate, endDate)
    eeCollection.filterMetadata(
        'CLOUD_COVER',
        'less_than',
        metadataCloudCoverMax
    )
    eeMosaicImage = ee.Algorithms.Landsat.simpleComposite(
        eeCollection,
        simpleCompositeVariable,
        10,
        40,
        True
    )
    return imageToMapId(eeMosaicImage, visParams)


def filteredSentinelComposite(visParams, startDate, endDate, metadataCloudCoverMax):
    def cloudScore(img):
        def rescale(img, exp, thresholds):
            return img.expression(exp, {'img': img}).subtract(thresholds[0]).divide(thresholds[1] - thresholds[0])

        score = ee.Image(1.0)
        score = score.min(rescale(img, 'img.B2', [0.1, 0.3]))
        score = score.min(rescale(img, 'img.B4 + img.B3 + img.B2', [0.2, 0.8]))
        score = score.min(
            rescale(img, 'img.B8 + img.B11 + img.B12', [0.3, 0.8]))
        ndsi = img.normalizedDifference(['B3', 'B11'])
        return score.min(rescale(ndsi, 'img', [0.8, 0.6]))

    def cloudScoreS2(img):
        rescale = img.divide(10000)
        score = cloudScore(rescale).multiply(100).rename('cloudscore')
        return img.addBands(score)

    sentinel2 = ee.ImageCollection('COPERNICUS/S2')
    f2017s2 = sentinel2.filterDate(startDate, endDate).filterMetadata(
        'CLOUDY_PIXEL_PERCENTAGE', 'less_than', metadataCloudCoverMax)
    m2017s2 = f2017s2.map(cloudScoreS2)
    m2017s3 = m2017s2.median()
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


def getTimeSeriesByIndex(indexName, scale, coords, startDate, endDate, reducer):
    bandsByCollection = {
        'LANDSAT/LC08/C01/T1_TOA': ['B2', 'B3', 'B4', 'B5', 'B6', 'B7'],
        'LANDSAT/LC08/C01/T2_TOA': ['B2', 'B3', 'B4', 'B5', 'B6', 'B7'],
        'LANDSAT/LE07/C01/T1_TOA': ['B1', 'B2', 'B3', 'B4', 'B5', 'B7'],
        'LANDSAT/LE07/C01/T2_TOA': ['B1', 'B2', 'B3', 'B4', 'B5', 'B7'],
        'LANDSAT/LT05/C01/T1_TOA': ['B1', 'B2', 'B3', 'B4', 'B5', 'B7'],
        'LANDSAT/LT05/C01/T2_TOA': ['B1', 'B2', 'B3', 'B4', 'B5', 'B7'],
        'LANDSAT/LT04/C01/T1_TOA': ['B1', 'B2', 'B3', 'B4', 'B5', 'B7'],
        'LANDSAT/LT04/C01/T2_TOA': ['B1', 'B2', 'B3', 'B4', 'B5', 'B7']
    }
    indexes = {
        'NDVI': '(nir - red) / (nir + red)',
        'EVI': '2.5 * (nir - red) / (nir + 6.0 * red - 7.5 * blue + 1)',
        'EVI2': '2.5 * (nir - red) / (nir + 2.4 * red + 1)',
        'NDMI': '(nir - swir1) / (nir + swir1)',
        'NDWI': '(green - nir) / (green + nir)',
        'NBR': '(nir - swir2) / (nir + swir2)',
        'LSAVI': '((nir - red) / (nir + red + 0.5)) * (1 + 0.5)'
    }

    def create(name):
        def maskClouds(image):
            def isSet(types):
                """ https://landsat.usgs.gov/collectionqualityband """
                typeByValue = {
                    'badPixels': 15,
                    'cloud': 16,
                    'shadow': 256,
                    'snow': 1024,
                    'cirrus': 4096
                }
                anySet = ee.Image(0)
                for Type in types:
                    anySet = anySet.Or(image.select(
                        'BQA').bitwiseAnd(typeByValue[Type]).neq(0))
                return anySet
            return image.updateMask(isSet(['badPixels', 'cloud', 'shadow', 'cirrus']).Not())

        def toIndex(image):
            bands = bandsByCollection[name]
            return image.expression(indexes[indexName], {
                'blue': image.select(bands[0]),
                'green': image.select(bands[1]),
                'red': image.select(bands[2]),
                'nir': image.select(bands[3]),
                'swir1': image.select(bands[4]),
                'swir2': image.select(bands[5]),
            }).clamp(-1, 1).rename(['index'])

        def toIndexWithTimeStart(image):
            time = image.get('system:time_start')
            image = maskClouds(image)
            return toIndex(image).set('system:time_start', time)
        #
        if startDate and endDate:
            return ee.ImageCollection(name).filterDate(startDate, endDate).filterBounds(geometry).map(toIndexWithTimeStart, True)
        else:
            return ee.ImageCollection(name).filterBounds(geometry).map(toIndexWithTimeStart, True)

    def reduceRegion(image):
        theReducer = getReducer(reducer)
        reduced = image.reduceRegion(
            theReducer, geometry=geometry, scale=scale, maxPixels=1e6)
        return ee.Feature(None, {
            'index': reduced.get('index'),
            'timeIndex': [image.get('system:time_start'), reduced.get('index')]
        })

    geometry = None
    if isinstance(coords[0], list) or isinstance(coords[0], tuple):
        geometry = ee.Geometry.Polygon(coords)
    else:
        geometry = ee.Geometry.Point(coords)
    collection = ee.ImageCollection([])
    for name in bandsByCollection:
        collection = collection.merge(create(name))
    return ee.ImageCollection(ee.ImageCollection(collection).sort('system:time_start').distinct('system:time_start')) \
        .map(reduceRegion) \
        .filterMetadata('index', 'not_equals', None) \
        .aggregate_array('timeIndex') \
        .getInfo()


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
    elev = ee.Image('USGS/GTOPO30')
    minmaxElev = elev.reduceRegion(
        reducer=ee.Reducer.minMax(),
        geometry=extentGeom,
        scale=30,
        bestEffort=True,
        maxPixels=500000000)
    minElev = minmaxElev.get('elevation_min').getInfo()
    maxElev = minmaxElev.get('elevation_max').getInfo()
    ciesinPopGrid = ee.Image('CIESIN/GPWv4/population-count/2020')
    popDict = ciesinPopGrid.reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=extentGeom,
        scale=30,
        bestEffort=True,
        maxPixels=500000000)
    pop = popDict.get('population-count').getInfo()
    pop = int(pop)
    return {
        'minElev': minElev,
        'maxElev': maxElev,
        'pop': pop
    }
