# GitHub URL: https://github.com/giswqs/qgis-earthengine-examples/tree/master/inputs.py

import ee


LANDSAT_BAND_DICT = {
    'L9': [1, 2, 3, 4, 5, 9, 6],
    'L8': [1, 2, 3, 4, 5, 9, 6],
    'L7': [0, 1, 2, 3, 4, 5, 7],
    'L5': [0, 1, 2, 3, 4, 5, 6],
    'L4': [0, 1, 2, 3, 4, 5, 6],
}
LANDSAT_BAND_NAMES = ['BLUE', 'GREEN',
                        'RED', 'NIR', 'SWIR1', 'TEMP', 'SWIR2']

def getBitMask(image:ee.Image, bandName:str, bitMasks:dict):
    """ creates a binary mask from an images bitmask. Expects a dictionary where each item
    has a dictionary of {'value':int, 'bit':int}. for example in the QA_PIXEL clouds are flagged
    using bit 3 with a value of 1.
    
    bitMask = {
        'clouds':{
            'value':1,
            'bit':3
            }
        }
    
     """
    mask = ee.Image(1)
    for _, maskItem in bitMasks.items():
        mask = mask.Or(image.select(
            bandName).bitwiseAnd(maskItem['value'] << maskItem['bit']).eq(0))
    return mask

def calcNDMI(image):
    ndmi = ee.Image(image).normalizedDifference(['NIR', 'SWIR1']).rename('NDMI')
    return ndmi

def calcNDWI(image):
    ndwi = ee.Image(image).normalizedDifference(['GREEN', 'NIR']).rename('NDWI')
    return ndwi

def calcLSAVI(image):
    lsavi = image.expression(
    '((nir - red) / (nir + red + 0.5)) * (1 + 0.5)', {
        'blue': image.select('BLUE'),
        'green': image.select('GREEN'),
        'red': image.select('RED'),
        'nir': image.select('NIR'),
        'swir1': image.select('SWIR1'),
        'swir2': image.select('SWIR2'),
    }).rename(['LSAVI'])

    return lsavi

def calcNDVI(image):
    ndvi = ee.Image(image).normalizedDifference(['NIR', 'RED']).rename('NDVI')
    return ndvi


def calcNBR(image):
    nbr = ee.Image(image).normalizedDifference(['NIR', 'SWIR2']).rename('NBR')
    return nbr


def calcNDFI(image):
    gv = [.0500, .0900, .0400, .6100, .3000, .1000]
    shade = [0, 0, 0, 0, 0, 0]
    npv = [.1400, .1700, .2200, .3000, .5500, .3000]
    soil = [.2000, .3000, .3400, .5800, .6000, .5800]
    cloud = [.9000, .9600, .8000, .7800, .7200, .6500]
    cf = .1  # Not parameterized

    # ensure bands are selected in correct order.
    image = image.select(['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2'])
    cfThreshold = ee.Image.constant(cf)
    unmixImage = ee.Image(image).unmix([gv, shade, npv, soil, cloud], True, True) \
        .rename(['GV', 'Shade', 'NPV', 'Soil', 'Cloud'])
    mask = unmixImage.select('Cloud').lt(cfThreshold)

    ndfi = ee.Image(unmixImage).expression(
        '((GV / (1 - SHADE)) - (NPV + SOIL)) / ((GV / (1 - SHADE)) + NPV + SOIL)', {
            'GV': unmixImage.select('GV'),
            'SHADE': unmixImage.select('Shade'),
            'NPV': unmixImage.select('NPV'),
            'SOIL': unmixImage.select('Soil')
        }).rename(['NDFI'])

    return ee.Image.cat([unmixImage, ndfi]).updateMask(mask)


def calcEVI(image):

    evi = ee.Image(image).expression(
        'float(2.5*(((B4) - (B3)) / ((B4) + (6 * (B3)) - (7.5 * (B1)) + 1)))',
        {
            'B4': ee.Image(image).select(['NIR']),
            'B3': ee.Image(image).select(['RED']),
            'B1': ee.Image(image).select(['BLUE'])
        }).rename('EVI')

    return evi


def calcEVI2(image):
    evi2 = ee.Image(image).expression(
        'float(2.5*(((B4) - (B3)) / ((B4) + (2.4 * (B3)) + 1)))',
        {
            'B4': image.select('NIR'),
            'B3': image.select('RED')
        })
    return evi2


def tcTrans(image):

    # Calculate tasseled cap transformation
    brightness = image.expression(
        '(L1 * B1) + (L2 * B2) + (L3 * B3) + (L4 * B4) + (L5 * B5) + (L6 * B6)',
        {
            'L1': image.select('BLUE'),
            'B1': 0.2043,
            'L2': image.select('GREEN'),
            'B2': 0.4158,
            'L3': image.select('RED'),
            'B3': 0.5524,
            'L4': image.select('NIR'),
            'B4': 0.5741,
            'L5': image.select('SWIR1'),
            'B5': 0.3124,
            'L6': image.select('SWIR2'),
            'B6': 0.2303
        })
    greenness = image.expression(
        '(L1 * B1) + (L2 * B2) + (L3 * B3) + (L4 * B4) + (L5 * B5) + (L6 * B6)',
        {
            'L1': image.select('BLUE'),
            'B1': -0.1603,
            'L2': image.select('GREEN'),
            'B2': -0.2819,
            'L3': image.select('RED'),
            'B3': -0.4934,
            'L4': image.select('NIR'),
            'B4': 0.7940,
            'L5': image.select('SWIR1'),
            'B5': -0.0002,
            'L6': image.select('SWIR2'),
            'B6': -0.1446
        })
    wetness = image.expression(
        '(L1 * B1) + (L2 * B2) + (L3 * B3) + (L4 * B4) + (L5 * B5) + (L6 * B6)',
        {
            'L1': image.select('BLUE'),
            'B1': 0.0315,
            'L2': image.select('GREEN'),
            'B2': 0.2021,
            'L3': image.select('RED'),
            'B3': 0.3102,
            'L4': image.select('NIR'),
            'B4': 0.1594,
            'L5': image.select('SWIR1'),
            'B5': -0.6806,
            'L6': image.select('SWIR2'),
            'B6': -0.6109
        })

    bright = ee.Image(brightness).rename('BRIGHTNESS')
    green = ee.Image(greenness).rename('GREENNESS')
    wet = ee.Image(wetness).rename('WETNESS')

    tasseledCap = ee.Image([bright, green, wet])
    return tasseledCap


def doIndices(collection):
    def indicesMapper(image):
        NDVI = calcNDVI(image)
        NBR = calcNBR(image)
        EVI = calcEVI(image)
        EVI2 = calcEVI2(image)
        NDWI = calcNDWI(image)
        NDMI = calcNDMI(image)
        LSAVI = calcLSAVI(image)
        TC = tcTrans(image)

        # NDFI function requires surface reflectance bands only
        BANDS = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2']
        NDFI = calcNDFI(image.select(BANDS))
        return image.addBands([NDVI, NBR, EVI, EVI2, TC, NDFI, NDWI, NDMI, LSAVI])

    return collection.map(indicesMapper)


def getLandsatScaled(image, orderedBandNames, orderedReadableBandNames):
    primaryScaleBands = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2']
    thermalBand = 'TEMP'
    tmp = ee.Image(image).select(orderedBandNames, orderedReadableBandNames)
    return scaleLandsatSr(tmp, primaryScaleBands, thermalBand)


def scaleLandsatSr(image, primaryBands, thermalBand):
    primaryScale = 0.0000275
    primaryOffset = -0.2
    primaryImg = image.select(primaryBands).multiply(primaryScale).add(primaryOffset)

    thermalScale = 0.00341802
    thermalOffset = 149
    thermalImg = image.select(thermalBand).multiply(thermalScale).add(thermalOffset)
    
    return image.addBands(primaryImg, None, True).addBands(thermalImg, None, True)


def prepareL4L5(image):
    # L4 and L5 have same band order so either L4 or L5 can be used 
    # as the orderedBandNames in getLandsatScaled.
    scaled = getLandsatScaled(image, LANDSAT_BAND_DICT['L4'],  LANDSAT_BAND_NAMES)
    
    # https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LT04_C02_T1_L2#bands
    # https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LT05_C02_T1_L2#bands
    cloudBitsToMask = {
        'dialated_cloud':{'bit':1,'value':1},
        'cloud': {'bit':3,'value':1},
        'shadow': {'bit':4,'value':1},
        }
    mask1 = getBitMask(image, 'QA_PIXEL', cloudBitsToMask)
    mask2 = image.select('QA_RADSAT').eq(0) # Gat valid data mask, for pixels without band saturation.
    mask3 = image.select(LANDSAT_BAND_DICT['L4']).reduce(ee.Reducer.min()).gt(0) #mask invalid data. 
    mask4 = image.select("SR_ATMOS_OPACITY").lt(300)  # Mask hazy pixels
    return scaled.updateMask(mask1.And(mask2).And(mask3).And(mask4))


def prepareL7(image):
    scaled = getLandsatScaled(image, LANDSAT_BAND_DICT['L7'],  LANDSAT_BAND_NAMES)
    
    cloudBitsToMask = {
        'dialated_cloud':{'bit':1,'value':1},
        'cloud': {'bit':3,'value':1},
        'shadow': {'bit':4,'value':1},
        }
    mask1 = getBitMask(image, 'QA_PIXEL', cloudBitsToMask)
    mask2 = image.select('QA_RADSAT').eq(0)# Gat valid data mask, for pixels without band saturation
    mask3 = image.select(LANDSAT_BAND_DICT['L7']).reduce(ee.Reducer.min()).gt(0)
    mask4 = image.select("SR_ATMOS_OPACITY").lt(300)# Mask hazy pixels
    mask5 = ee.Image(image).mask().reduce(ee.Reducer.min()).focal_min(2.5)# Slightly erode bands to get rid of artifacts due to scan lines

    return scaled.updateMask(mask1.And(mask2).And(mask3).And(mask4).And(mask5))


def prepareL8L9(image):
    # L8 and L9 have same band order so either L8 or L9 can be used 
    # as the orderedBandNames in getLandsatScaled.
    scaled = getLandsatScaled(image, LANDSAT_BAND_DICT['L8'],  LANDSAT_BAND_NAMES)
    
    cloudBitsToMask = {
        'dialated_cloud':{'bit':1,'value':1},
        'cloud': {'bit':3,'value':1},
        'shadow': {'bit':4,'value':1},
        }
    aerosolBitsToMask = {
        'high_aerosol':{'bit':7,'value':11}
    }

    mask1 = getBitMask(image, 'QA_PIXEL', cloudBitsToMask)
    mask2 = image.select('QA_RADSAT').eq(0)
    mask3 = image.select(LANDSAT_BAND_DICT['L8']).reduce(ee.Reducer.min()).gt(0)
    mask4 = getBitMask(image, 'SR_QA_AEROSOL', aerosolBitsToMask)

    return scaled.updateMask(mask1.And(mask2).And(mask3).And(mask4))

def filterRegion(collection, region=None):
    if region is None:
        return collection
    else:
        return collection.filterBounds(region)

def mergeLandsatCols(baseCollection, newCollection, start, end, region, func=None):
    filteredNewCollection = filterRegion(newCollection, region).filterDate(start, end)
    filteredNewCollectionSize = filteredNewCollection.toList(1).size().getInfo()
    if filteredNewCollectionSize > 0:
        if func:
            filteredNewCollection = filteredNewCollection.map(func, True)
        baseCollection = baseCollection.merge(filteredNewCollection)

    return baseCollection

def getLandsat(options):
    if options is None:
        return ("Error")
    else:
        if 'start' in options:
            start = options['start']
        else:
            start = '1990-01-01'
        if 'end' in options:
            end = options['end']
        else:
            end = '2021-01-01'
        if 'startDOY' in options:
            startDOY = options['startDOY']
        else:
            startDOY = 1
        if 'endDOY' in options:
            endDOY = options['endDOY']
        else:
            endDOY = 366
        if 'region' in options:
            region = options['region']
        else:
            region = None
        if 'targetBands' in options:
            targetBands = options['targetBands']
        else:
            targetBands = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1',
                           'SWIR2', 'NBR', 'NDFI', 'NDVI', 'GV', 'NPV', 'Shade', 'Soil']
        if 'sensors' in options:
            sensors = options['sensors']
        else:
            sensors = {"l4": True, "l5": True, "l7": True, "l8": True}

        col = ee.ImageCollection([]) #Empt collection to merge as we go

        fcollection4 = ee.ImageCollection('LANDSAT/LT04/C02/T1_L2')
        col = mergeLandsatCols(col, fcollection4, start, end, region, prepareL4L5)
        fcollection5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
        col = mergeLandsatCols(col, fcollection5, start, end, region, prepareL4L5)
        fcollection7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
        col = mergeLandsatCols(col, fcollection7, start, end, region, prepareL7)
        fcollection8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
        col = mergeLandsatCols(col, fcollection8, start, end, region, prepareL8L9)
        fcollection9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
        col = mergeLandsatCols(col, fcollection9, start, end, region, prepareL8L9)

        indices = doIndices(col).select(targetBands)
        indices = indices.filter(ee.Filter.dayOfYear(startDOY, endDOY))

        if "l5" not in sensors:
            indices = indices.filterMetadata(
                'SATELLITE', 'not_equals', 'LANDSAT_5')
        if "l4" not in sensors:
            indices = indices.filterMetadata(
                'SATELLITE', 'not_equals', 'LANDSAT_4')
        if "l7" not in sensors:
            indices = indices.filterMetadata(
                'SATELLITE', 'not_equals', 'LANDSAT_7')
        if "l8" not in sensors:
            indices = indices.filterMetadata(
                'SATELLITE', 'not_equals', 'LANDSAT_8')


    return ee.ImageCollection(indices).sort('system:time_start')


def prepareSentinel2Toa(image):
    bandsReadable = [
        "Aerosols",
        "BLUE",
        "GREEN",
        "RED",
        "RED_EDGE_1",
        "RED_EDGE_2",
        "RED_EDGE_3",
        "NIR",
        "RED_EDGE_4",
        "WATER_VAPOR",
        "CIRRUS",
        "SWIR1",
        "SWIR2",
    ]
    bands = [
        "B1",
        "B2",
        "B3",
        "B4",
        "B5",
        "B6",
        "B7",
        "B8",
        "B8A",
        "B9",
        "B10",
        "B11",
        "B12",
    ]
    scaled = image.addBands(image.divide(10000), None, True) \
        .select(bands,bandsReadable)
    
    cloudBitsToMask = {
        'cloud': {'bit':10,'value':1},
        'cirrus': {'bit':11,'value':1},
    }
    mask = getBitMask(image,'QA60',cloudBitsToMask)

    return scaled.updateMask(mask)


def bandPassAdjustment(img):
    bands = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR1']
    # linear regression coefficients for adjustment
    gain = ee.Array([[0.977], [1.005], [0.982], [1.001], [1.001], [0.996]])
    bias = ee.Array([[-0.00411], [-0.00093], [0.00094],
                    [-0.00029], [-0.00015], [-0.00097]])
    # Make an Array Image, with a 2-D Array per pixel.
    arrayImage2D = img.select(bands).toArray().toArray(1)

    # apply correction factors and reproject array to geographic image
    componentsImage = ee.Image(gain).multiply(arrayImage2D).add(ee.Image(bias)) \
        .arrayProject([0]).arrayFlatten([bands]).float()

    return img.addBands(componentsImage, None, True)


def getSentinel2Toa(options):
    if options is None:
        return "Error"
    
    region = options.get('region',None)
    adjustBands = options.get('bandPassAdjustment', False)
    start = options.get('start','2015-06-23')
    end = options.get('end','2025-01-01')
    startDOY = options.get('startDOY',1)
    endDOY = options.get('endDOY',1)
    
    
    s2 = ee.ImageCollection('COPERNICUS/S2_HARMONIZED').map(prepareSentinel2Toa)
    
    if adjustBands:
        s2 = s2.map(bandPassAdjustment)
    
    s2 = filterRegion(s2, region).filterDate(start, end) \
        .filter(ee.Filter.dayOfYear(startDOY, endDOY))
    
    return s2

def getS1(options):
    if options is None:
        pass
    else:
        if 'targetBands' in options:
            targetBands = options['targetBands']
        else:
            targetBands = ['VV', 'VH', 'VH/VV']
        if 'focalSize' in options:
            focalSize = options['focalSize']
        else:
            focalSize = None
        if "mode" in options:
            mode = options['mode']
        else:
            mode = 'ASCENDING'
        if 'region' in options:
            region = options['region']
        else:
            region = None

    def s1Mapper(img):
        fmean = img.add(30).focal_mean(focalSize)
        ratio0 = fmean.select('VH').divide(
            fmean.select('VV')).rename('VH/VV').multiply(30)
        ratio1 = fmean.select('VV').divide(
            fmean.select('VH')).rename('VV/VH').multiply(30)
        return img.select().addBands(fmean).addBands(ratio0).addBands(ratio1)

    def s1Deg(img):
        pwr = ee.Image(10).pow(img.divide(10))
        pwr = pwr.select('VV').subtract(pwr.select('VH')).divide(pwr.select('VV').add(pwr.select('VH'))) \
            .rename('RFDI')
        ratio0 = img.select('VV').divide(img.select('VH')).rename('VV/VH')
        ratio1 = img.select('VH').divide(img.select('VV')).rename('VH/VV')

        return img.addBands(pwr).addBands(ratio0).addBands(ratio1)

    data = ee.ImageCollection('COPERNICUS/S1_GRD') \
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')) \
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH')) \
        .filter(ee.Filter.eq('orbitProperties_pass', mode))\
        .filter(ee.Filter.eq('instrumentMode', 'IW')) \

    if focalSize:
        data = data.map(s1Mapper)
    else:
        data = data.map(s1Deg)

    if region is not None:
        data = data.filterBounds(region)
    return data.select(targetBands)

def getNICFI(options):
    if options is None:
        pass
    else:
        if 'start' in options:
            start = options['start']
        else:
            start = '2015-12-01'
        if 'end' in options:
            end = options['end']
        else:
            end = '2022-01-01'
    
    africa = ee.ImageCollection("projects/planet-nicfi/assets/basemaps/africa")
    americas = ee.ImageCollection("projects/planet-nicfi/assets/basemaps/americas")
    asia = ee.ImageCollection("projects/planet-nicfi/assets/basemaps/asia")
    ndvi = lambda img : img.addBands(img.normalizedDifference(['N','R']).rename('NDVI'))
    
    def mosaicByDate(date, collection):
        start = ee.Date(date)
        end = start.advance(1,'minute')
        image = collection.filterDate(start, end).mosaic()
        return image.set('system:time_start',date)
    
    data = africa.merge(americas).merge(asia)
    data = data.filterDate(start,end).map(ndvi)
    
    # NICFI footprints encapulate the entire wold making filtering by geometry useless.
    # mosaicing ensures that filtering for timeserries widget doesn't result in only
    # null values being kept after removing duplicate dates.
    dates = data.aggregate_array('system:time_start').distinct()
    mosaic_nicfi = dates.map(lambda img: mosaicByDate(img, data))
    
    return ee.ImageCollection(mosaic_nicfi)

def prepareLsToa(image):
    cloudBitsToMask = {
        'cloud': {'bit':3,'value':1},
        'shadow': {'bit':4,'value':1},
        'snow': {'bit':5,'value':1},
    }

    mask = getBitMask(image,'QA_PIXEL',cloudBitsToMask)

    return image.updateMask(mask)

def getLandsatToa(startDate, endDate, geometry=None, cloudFilter=60):
    # note: Excluding tier 2 TOA imagery because it has poor quality, but
    # leaving code commented out encase we choose to reinstate using
    # tier 2 imagery.
    collectionIds = {
        'LANDSAT/LC09/C02/T1_TOA' : LANDSAT_BAND_DICT['L9'],
        'LANDSAT/LC08/C02/T1_TOA' : LANDSAT_BAND_DICT['L8'],
        'LANDSAT/LE07/C02/T1_TOA' : LANDSAT_BAND_DICT['L7'],
        'LANDSAT/LT05/C02/T1_TOA' : LANDSAT_BAND_DICT['L5'],
        'LANDSAT/LT04/C02/T1_TOA' : LANDSAT_BAND_DICT['L4'],
        # 'LANDSAT/LC09/C02/T2_TOA' : LANDSAT_BAND_DICT['L9'],
        # 'LANDSAT/LC08/C02/T2_TOA' : LANDSAT_BAND_DICT['L8'],
        # 'LANDSAT/LE07/C02/T2_TOA' : LANDSAT_BAND_DICT['L7'],
        # 'LANDSAT/LT05/C02/T2_TOA' : LANDSAT_BAND_DICT['L5'],
        # 'LANDSAT/LT04/C02/T2_TOA' : LANDSAT_BAND_DICT['L4'],
    }


    collection = ee.ImageCollection([])
    for name, bands in collectionIds.items():
        # make new lists with QA_PIXEL included for cloud masking
        bands = bands + ['QA_PIXEL']
        readableBands = LANDSAT_BAND_NAMES + ['QA_PIXEL']

        tmpCollection = ee.ImageCollection(name).select(bands, readableBands).filter(ee.Filter.lt('CLOUD_COVER', cloudFilter))
        collection = mergeLandsatCols(collection, tmpCollection, startDate, endDate, geometry, prepareLsToa)
    
    collection = doIndices(collection)

    return collection