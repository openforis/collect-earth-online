# GitHub URL: https://github.com/giswqs/qgis-earthengine-examples/tree/master/inputs.py

import ee

##################################
#
# Utility functions for getting inputs for CCDC
#
# /*/

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
    cfThreshold = ee.Image.constant(cf)
    unmixImage = ee.Image(image).unmix([gv, shade, npv, soil, cloud], True, True) \
        .rename(['band_0', 'band_1', 'band_2', 'band_3', 'band_4'])
    newImage = ee.Image(image).addBands(unmixImage)
    mask = newImage.select('band_4').lt(cfThreshold)
    ndfi = ee.Image(unmixImage).expression(
        '((GV / (1 - SHADE)) - (NPV + SOIL)) / ((GV / (1 - SHADE)) + NPV + SOIL)', {
            'GV': ee.Image(unmixImage).select('band_0'),
            'SHADE': ee.Image(unmixImage).select('band_1'),
            'NPV': ee.Image(unmixImage).select('band_2'),
            'SOIL': ee.Image(unmixImage).select('band_3')
        })

    return ee.Image(newImage) \
        .addBands(ee.Image(ndfi).rename(['NDFI'])) \
        .select(['band_0', 'band_1', 'band_2', 'band_3', 'NDFI']) \
        .rename(['GV', 'Shade', 'NPV', 'Soil', 'NDFI']) \
        .updateMask(mask)


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
        TC = tcTrans(image)
        # NDFI function requires surface reflectance bands only
        BANDS = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2']
        NDFI = calcNDFI(image.select(BANDS))
        return image.addBands([NDVI, NBR, EVI, EVI2, TC, NDFI])
    return collection.map(indicesMapper)


def prepareL4L5(image):
    bandList = ['B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'B6']
    nameList = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'TEMP']
    scaling = [10000, 10000, 10000, 10000, 10000, 10000, 1000]
    scaled = ee.Image(image).select(bandList).rename(
        nameList).divide(ee.Image.constant(scaling))
    validQA = [66, 130, 68, 132]
    mask1 = ee.Image(image).select(['pixel_qa']).remap(
        validQA, ee.List.repeat(1, len(validQA)), 0)
    # Gat valid data mask, for pixels without band saturation
    mask2 = image.select('radsat_qa').eq(0)
    mask3 = image.select(bandList).reduce(ee.Reducer.min()).gt(0)
    # Mask hazy pixels
    mask4 = image.select("sr_atmos_opacity").lt(300)
    return image.addBands(scaled).updateMask(mask1.And(mask2).And(mask3).And(mask4))


def prepareL7(image):
    bandList = ['B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'B6']
    nameList = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'TEMP']
    scaling = [10000, 10000, 10000, 10000, 10000, 10000, 1000]
    scaled = ee.Image(image).select(bandList).rename(
        nameList).divide(ee.Image.constant(scaling))

    validQA = [66, 130, 68, 132]
    mask1 = ee.Image(image).select(['pixel_qa']).remap(
        validQA, ee.List.repeat(1, len(validQA)), 0)
    # Gat valid data mask, for pixels without band saturation
    mask2 = image.select('radsat_qa').eq(0)
    mask3 = image.select(bandList).reduce(ee.Reducer.min()).gt(0)
    # Mask hazy pixels
    mask4 = image.select("sr_atmos_opacity").lt(300)
    # Slightly erode bands to get rid of artifacts due to scan lines
    mask5 = ee.Image(image).mask().reduce(ee.Reducer.min()).focal_min(2.5)
    return image.addBands(scaled).updateMask(mask1.And(mask2).And(mask3).And(mask4).And(mask5))


def prepareL8(image):
    bandList = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B10']
    nameList = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'TEMP']
    scaling = [10000, 10000, 10000, 10000, 10000, 10000, 1000]

    validTOA = [66, 68, 72, 80, 96, 100, 130, 132, 136, 144, 160, 164]
    validQA = [322, 386, 324, 388, 836, 900]

    scaled = ee.Image(image).select(bandList).rename(
        nameList).divide(ee.Image.constant(scaling))
    mask1 = ee.Image(image).select(['pixel_qa']).remap(
        validQA, ee.List.repeat(1, len(validQA)), 0)
    mask2 = ee.Image(image).select('radsat_qa').eq(0)
    mask3 = ee.Image(image).select(bandList).reduce(ee.Reducer.min()).gt(0)
    mask4 = ee.Image(image).select(['sr_aerosol']).remap(
        validTOA, ee.List.repeat(1, len(validTOA)), 0)
    return ee.Image(image).addBands(scaled).updateMask(mask1.And(mask2).And(mask3).And(mask4))

def filterRegion(collection, region=None):
    if region is None:
        return collection
    else:
        return collection.filterBounds(region)

def mergeLandsatCols(baseCollection, newCollection, start, end, region, func):
    filteredNewCollection = filterRegion(newCollection, region).filterDate(start, end)
    filteredNewCollectionSize = filteredNewCollection.toList(1).size().getInfo()
    if filteredNewCollectionSize > 0:
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
        if 'useMask' in options:
            useMask = options['useMask']
        else:
            useMask = True
        if 'sensors' in options:
            sensors = options['sensors']
        else:
            sensors = {"l4": True, "l5": True, "l7": True, "l8": True}
        if useMask == 'No':
            useMask = False

        col = ee.ImageCollection([]) #Empt collection to merge as we go

        fcollection4 = ee.ImageCollection('LANDSAT/LT04/C01/T1_SR')
        col = mergeLandsatCols(col, fcollection4, start, end, region, prepareL4L5)
        fcollection5 = ee.ImageCollection('LANDSAT/LT05/C01/T1_SR')
        col = mergeLandsatCols(col, fcollection5, start, end, region, prepareL4L5)
        fcollection7 = ee.ImageCollection('LANDSAT/LE07/C01/T1_SR')
        col = mergeLandsatCols(col, fcollection7, start, end, region, prepareL7)
        fcollection8 = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
        col = mergeLandsatCols(col, fcollection8, start, end, region, prepareL8)

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
