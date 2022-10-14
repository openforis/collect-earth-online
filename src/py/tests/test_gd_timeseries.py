from gee.utils import getStatistics
import ee

ee.Initialize()


extent_10k_meters = [
    [-69.58294964099962, 0.22595177819695778],
    [-69.4333472810004, 0.22595177819695778],
    [-69.4333472810004, 0.32209231291884066],
    [-69.58294964099962, 0.32209231291884066],
    [-69.58294964099962, 0.22595177819695778],
]

extent_medium = [
    [102.99821884882748, 22.04590447493294],
    [103.00106140517254, 22.04590447493294],
    [103.00106140517254, 22.047710457303737],
    [102.99821884882748, 22.047710457303737],
    [102.99821884882748, 22.04590447493294],
]

extent_large = [
    [102.98959792598409, 22.038772240079215],
    [103.01208556636495, 22.038772240079215],
    [103.01208556636495, 22.057546930796825],
    [102.98959792598409, 22.057546930796825],
    [102.98959792598409, 22.038772240079215],
]

extent_small = [
    [-105.70309454759177, 32.92068657304802],
    [-105.70277504989055, 32.92068657304802],
    [-105.70277504989055, 32.92095648715381],
    [-105.70309454759177, 32.92095648715381],
    [-105.70309454759177, 32.92068657304802],
]


def main(results):
    assert isinstance(
        results, dict
    ), "results from getStatistics should be a client side dictionary"
    assert "maxElev" in list(results.keys()), "maxElev not in statistics result"
    assert "minElev" in list(results.keys()), "minElev not in statistics result"
    assert "pop" in list(results.keys()), "pop not in statistics result"
    assert isinstance(results.get("maxElev"), int), "maxElev should be an int"
    assert isinstance(results.get("minElev"), int), "minElev should be an int"
    assert isinstance(results.get("pop"), int), "pop should be an int"
   


def test_extent_10k():
    results = getStatistics(extent_10k_meters)
    main(results)

def test_extent_small():
    results = getStatistics(extent_small)
    main(results)


def test_extent_medium():
    results = getStatistics(extent_medium)
    main(results)


def test_extent_large():
    results = getStatistics(extent_large)
    main(results)
