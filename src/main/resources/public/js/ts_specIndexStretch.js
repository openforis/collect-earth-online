// navigator.serviceWorker.register('/ts_sw.js', {
//     scope: '/'
// });

// navigator.serviceWorker.register('/ts_sw.js', {scope: '/'});

// navigator.serviceWorker.ready.then(()=>console.log("service worker ready!"));

//define the mean and stdev of indices for stretching
var stretch={
    "B1":{
        "mean":0.0604, //604,
        "stdev":0.067, //670
        "min":0, //0,
        "max":0.1203 //1203
    },
    "B2":{
        "mean":0.0827, //827,
        "stdev":0.0410, //410
        "min":0, //0,
        "max":0.1571 //1571
    },
    "B3":{
        "mean":0.0903, //903,
        "stdev":0.0555, //555
        "min":0, //0,
        "max":0.1962 //1962
    },
    "B4":{
        "mean":0.2317, //2317,
        "stdev":0.0659, //659
        "min":0.0912, //912,
        "max":0.3880 //3880
    },
    "B5":{
        "mean":0.2287, //2287,
        "stdev":0.09, //900
        "min":0.0234, //234,
        "max":0.3618 //3618
    },
    "B7":{
        "mean":0.1611, //1611,
        "stdev":0.0829, //829
        "min":0.0604, //604,
        "max":0.5592 //5592
    },
    "TCB":{
        "mean":0.3098, //3098,
        "stdev":0.1247, //1247
        "min":0.0604, //604,
        "max":0.5592 //5592
    },
    "TCG":{
        "mean":0.1549, //1549,
        "stdev":0.0799, //799
        "min":0.0049, //49,
        "max":0.3147 //3147
    },
    "TCW":{
        "mean":-0.0701, //-701,
        "stdev":0.0772, //772
        "min":-0.2245, //-2245,
        "max":0.0843 //843
    },
    "TCA":{
        "mean":15.32, //1532,
        "stdev":10.02, //1002
        "min":-0.0472, //-472,
        "max":0.3536 //3536
    },
    "NDVI":{
        "mean":0.4600587,
        "stdev":0.1833235,
        "min":0.0934117,
        "max":0.8267057
    },
    "NBR":{
        "mean":0.2174783,
        "stdev":0.2293639,
        "min":-0.2412495,
        "max":0.6762061
    }
};

//define the domain of the indices for scaling to the range of the plot
var defaultDomain={
    "B1":{
        "min":-0.005, //-50
        "max":0.2 //2000
    },
    "B2":{
        "min":-0.005, //-50
        "max":0.2 //2000
    },
    "B3":{
        "min":-0.005, //-50
        "max":0.25 //2500
    },
    "B4":{
        "min":-0.005, //-50
        "max":0.45 //4500
    },
    "B5":{
        "min":-0.005, //-50
        "max":0.45 //4500
    },
    "B7":{
        "min":-0.005, //-50
        "max":0.4 //4000
    },
    "TCB":{
        "min":0,
        "max":0.7 //7000
    },
    "TCG":{
        "min":-0.05, //-500
        "max":0.25 //2500
    },
    "TCW":{
        "min":-0.35, //-3500,
        "max":0.05  //500
    },
    "TCA":{
        "min":-5, //-500,
        "max":45 //4500
    },
    "NDVI":{
        "min":-1,
        "max":1
    },
    "NBR":{
        "min":-1,
        "max":1
    },
    "year":{
        "min":1984,
        "max":0
    }
};
