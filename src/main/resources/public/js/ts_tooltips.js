
$("#toolTips").click(function(){
    var toolTips = $("#toolTipsCheck")	;
    if(toolTips.hasClass("glyphicon-ok")){
        toolTips.removeClass("glyphicon glyphicon-ok").addClass("glyphicon glyphicon-none");
        removeToolTips();
    } else{
        toolTips.removeClass("glyphicon glyphicon-none").addClass("glyphicon glyphicon-ok");
        appendToolTips();
    }
});


function appendToolTips(){
    $("#plotList li").prop("title","This is a plot selector. Clicking on it will load the plot's spectral time series data and the corresponding image chips. Each time you select a new plot the display properties of the previous plot will be saved for the session. Segmentation and vertex interpretations will also be saved.");
    $("#plotList li").find("span").prop("title","This is a plot complete indicator. A checkmark will appear when a plot's interpretation is complete.");
    $("#projBtn").prop("title","This is the project selection dropdown menu. Clicking on a project will the load the list of plots available.");
    $("#chipSize").prop("title", "This is the image chip size selector. Clicking the up/down arrows will change the size of the image chips. The value is the number of pixels on a side.");
    $("#zoomSize").prop("title", "This is the image chip zoom selector. Moving the slider will change the scale of the image chips. You can also change the scale by holding the shift key and mouse scrolling while hovering over an image chip.");
    $("#btnIndex").prop("title", "This is the spectral index/band dropdown menu. Select an index or band to change the data in the spectral time series window.");
    $("#btnLine").prop("title", "This is a toggle to show or hide the segmented spectral time series line. Click the button to toggle. The thumbs up icon indicates that the line is to be shown, and the thumbs down icon indicates that the line is to be hidden. Generally you want to keep it on, though turning it off is sometimes useful if you are concerned about the line biasing your judgment.");
    $("#btnPoints").prop("title", "This is a toggle to show or hide all the spectral data for a plot. Click the button to toggle. The thumbs up icon indicates that all data should be shown, and the thumbs down icon indicates that only the annual spectral points should be shown. Toggling it on can be helpful for quality assessment of the default annual point and to verify that a change is not simply an anomaly or phenology.");
    $("#btnResetGlobal").prop("title", "This is the global axes stretch button. Clicking the button will return the spectral time series plot to the default pre-defined global domain for the spectral index/band currently displayed.");
    $("#btnResetLocal").prop("title", "This is the local axes stretch button. Clicking the button will return the spectral time series plot to the domain of the current plot's data for the spectral index/band currently displayed.");
    d3.selectAll("circle.data").select("title").text("This is an annual spectral time series point. It is the spectral return for the pixel at the plot center for the day selected to represent this year in the annual time series. Hovering over it will activate a green highlight outline that corresponds to the green highlight outline of the matched image chip in the chip gallery. The highlighting feature makes it easy to know which point belongs to which image chip. Doubling clicking the point will toggle it as a vertex. The first and last points cannot be toggled.");
    d3.selectAll("circle.allData").select("title").text("This is an intra-annual spectral time series point. It is the spectral return for the pixel at the plot center for one of all days selected to represent a year in the annual time series. It will be highlighted blue when hovering over an image chip in the intra-annual chip window as a correspondence marking feature. These points are helpful for determining the intra-annual variability of plots and can help make a more informed decision about whether to place a vertex or change the default annual point/image chip.");
    d3.selectAll("#xbox").select("title").text("This is the x-axis. Click and hold to drag the scale to the left or right and mouse wheel to zoom in and out.");
    d3.selectAll("#ybox").select("title").text("This is the y-axis. Click and hold to drag the scale up or down and mouse wheel to zoom in and out.");
    $("span.glyphicon.glyphicon-search").prop("title","This is a vertex/segment identification button. When clicked on it will highlight either the vertex or vertices in the spectral time series and the image chips which corresponding to the row in the form. It is a helpful crosswalk between the interpretation forms and the spectral point and image data. When it is active, you cannot select new vertices. To deactivate it, click the icon again.");
    $("canvas.chipImg.annual").prop("title","This is an annual image chip. It represents the 255 x 255 pixel image subset centered on the plot. There is one image per year and the center pixel outlined in white corresponds to a spectral point in the pixel time series. The correspondence between this image chip and its mathcing point in the spectral point time series is marked by shared green highlighting on hover. Holding the shift key while mouse wheeling on an image chip will change the scale. Double clicking on an image chip will toggle a vertex on and off. Image chips that are outlined in red represent vertices.");
    $("span.expandChipYear").prop("title","This is intra-annual image chip window icon. Clicking it will open a new window and/or load all image chips for the year. In the intra-annual image chip window, all chips have a corresponding intra-annual spectral point in the time series plot. Hovering over any of the image chips while the Show Points (show intra-annual points) toggle is active (thumbs up), the corresponding point will be highlighted in blue. This will help you make a decision about which point is best suited to represent the year. Clicking on any of the image chips will set that chip as the new data for the year. The data will immediately change in the main chip gallery and in the spectral time series plot.");
    $(".chipDate").prop("title","This is the year and day of the image chip and corresponding point in the spectral time series plot. The day is defined by day-of-year. In the Help button dropdown menu there is a conversion calendar that links day-of-year to month-day to help interpret when the image was recorded.");
    $("#chipGallerySection").prop("title","This is the annual image chip gallery. It holds the time series of image chips. The chips in the gallery will repopulate each time you click on a plot from the plot list. Use the scroll bar on the right to view image chips that are off the screen, and use the 'Chip Size' selector at the top of the interface to change the chip size to your preference.");
    $("#segmentsFormTab").prop("title","This is the segments interpretation tab. Clicking it will active the segmentation interpretation form.");
    $("#verticesFormTab").prop("title","This is the vertices interpretation tab. Clicking it will active the vertices interpretation form.");
    $("#CommentsFormTab").prop("title","This is the comments interpretation tab. Clicking it will active the comments interpretation form.");
    $("#CommentsFormDiv").prop("title","This is the plot comment input form. Any comments you have regarding the plot can be typed here and will be saved with the segment and vertex interpretations.");
    $("#targetDOY").prop("title","This label defines the target day-of-year (DOY) for a given plot. Image chips for the plot are selected based on their nearness to this date.");
}


function removeToolTips(){
    $("#plotList li").prop("title","");
    $("#plotList li").find("span").prop("title","");
    $("#projBtn").prop("title","");
    $("#chipSize").prop("title","");
    $("#zoomSize").prop("title","");
    $("#btnIndex").prop("title","");
    $("#btnLine").prop("title","");
    $("#btnPoints").prop("title","");
    $("#btnResetGlobal").prop("title","");
    $("#btnResetLocal").prop("title","");
    d3.selectAll("circle.data").select("title").text("");
    d3.selectAll("circle.allData").select("title").text("");
    d3.selectAll("#xbox").select("title").text("");
    d3.selectAll("#ybox").select("title").text("");
    $("span.glyphicon.glyphicon-search").prop("title","");
    $("canvas.chipImg.annual").prop("title","");
    $("span.expandChipYear").prop("title","");
    $(".chipDate").prop("title","");
    $("#chipGallerySection").prop("title","");
    $("#segmentsFormTab").prop("title","");
    $("#verticesFormTab").prop("title","");
    $("#CommentsFormTab").prop("title","");
    $("#CommentsFormDiv").prop("title","");
    $("#targetDOY").prop("title","");
}
