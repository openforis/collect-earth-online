from gee.inputs import *
import ee

credentials = ee.ServiceAccountCredentials(
    "zgateway1@ceo-production.iam.gserviceaccount.com",
    "/home/jdilger/ceo2/collect-earth-online/ceo-gee-key.json",
)
ee.Initialize(credentials)

start = "1990-01-01"
end = "2022-01-01"

region = ee.Geometry.Polygon(
    [
        [
            [-102.14254958343689, 23.777184490610008],
            [-102.14254958343689, 23.769486813185306],
            [-102.13396651458923, 23.769486813185306],
            [-102.13396651458923, 23.777184490610008],
        ]
    ],
    None,
    False,
)


def test_landsat_toa():
    col = getLandsatToa(start, end, region)

    assert (
        col.limit(1).size().getInfo() == 1
    ), "landsat toa collection doesnt have correct number of images"
    valid_image_test = col.limit(5).max().reduceRegion(ee.Reducer.max(), region, 500)
    assert isinstance(
        valid_image_test.getInfo()["BLUE"], float
    ), "landsat toa blue band is not a float (may be masked)"


def test_nicfi():
    col = getNICFI({"startDate": start, "endDate": end})

    assert (
        col.limit(1).size().getInfo() == 1
    ), "nicfi collection doesnt have correct number of images"
    valid_image_test = col.max().reduceRegion(ee.Reducer.max(), region, 500)
    assert isinstance(
        valid_image_test.getInfo()["NDVI"], float
    ), "nicfi NDVI band is not a float (may be masked)"


class TestLandsatSr:
    start = "1990-01-01"
    end = "2022-01-01"

    region = ee.Geometry.Polygon(
        [
            [
                [-108.17224062410138, 31.78141783950139],
                [-108.17224062410138, 31.760986352066453],
                [-108.15026796785138, 31.760986352066453],
                [-108.15026796785138, 31.78141783950139],
            ]
        ],
        None,
        False,
    )

    def main(self, col: ee.ImageCollection, col_name: str):
        assert (
            col.limit(1).size().getInfo() == 1
        ), f"{col_name} collection doesnt have correct number of images"
        valid_image_test = (
            col.limit(5).max().reduceRegion(ee.Reducer.max(), self.region, 500)
        )
        assert isinstance(
            valid_image_test.getInfo()["BLUE"], float
        ), f"{col_name} blue band is not a float (may be masked)"
        assert isinstance(
            col.first().get("system:time_start").getInfo(), int
        ), f'first {col_name} system:time_start should be an integer. Value: {col.first().get("system:time_start").getInfo()} '

    def test_landsat_4(self):
        # test landsat 4 merge collection
        fcollection4 = ee.ImageCollection("LANDSAT/LT04/C02/T1_L2")
        col = ee.ImageCollection([])
        col = mergeLandsatCols(
            col, fcollection4, self.start, self.end, self.region, prepareL4L5
        )
        self.main(col, "landsat 4")

    def test_landsat_5(self):
        fcollection5 = ee.ImageCollection("LANDSAT/LT05/C02/T1_L2")
        col = ee.ImageCollection([])
        col = mergeLandsatCols(
            col, fcollection5, self.start, self.end, self.region, prepareL4L5
        )
        self.main(col, "landsat 5")

    def test_landsat_7(self):
        # test landsat 7 merge collection
        fcollection7 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2")
        col = ee.ImageCollection([])
        col = mergeLandsatCols(
            col, fcollection7, self.start, self.end, self.region, prepareL7
        )
        self.main(col, "landsat 7")

    def test_landsat_8(self):
        fcollection8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
        col = ee.ImageCollection([])
        col = mergeLandsatCols(
            col, fcollection8, self.start, self.end, self.region, prepareL8L9
        )
        self.main(col, "landsat 8")

    def test_landsat_9(self):
        fcollection9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")
        col = ee.ImageCollection([])
        col = mergeLandsatCols(
            col, fcollection9, self.start, self.end, self.region, prepareL8L9
        )
        self.main(col, "landsat 9")



class TestSentinel2:
    start = "1990-01-01"
    end = "2022-01-01"

    region = ee.Geometry.Polygon(
        [
            [
                [-108.17224062410138, 31.78141783950139],
                [-108.17224062410138, 31.760986352066453],
                [-108.15026796785138, 31.760986352066453],
                [-108.15026796785138, 31.78141783950139],
            ]
        ],
        None,
        False,
    )
    def main(self, col: ee.ImageCollection, col_name: str):
        assert (
            col.limit(1).size().getInfo() == 1
        ), f"{col_name} collection doesnt have correct number of images"
        valid_image_test = (
            col.limit(5).max().reduceRegion(ee.Reducer.max(), self.region, 500)
        )
        assert isinstance(
            valid_image_test.getInfo()["BLUE"], float
        ), f"{col_name} blue band is not a float (may be masked)"
        assert isinstance(
            col.first().get("system:time_start").getInfo(), int
        ), f'first {col_name} system:time_start should be an integer. Value: {col.first().get("system:time_start").getInfo()} '

    def test_sentinel2_toa_defaults(self):
        col = getSentinel2Toa({'region':self.region})
        self.main(col, "sentinel 2 toa default options")

    